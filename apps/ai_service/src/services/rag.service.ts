import {
    Injectable,
    OnModuleInit,
    OnModuleDestroy,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { MongoClient } from 'mongodb';
import { Document } from '@langchain/core/documents';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { MongoDBAtlasVectorSearch } from '@langchain/mongodb';
import {
    GoogleGenerativeAIEmbeddings,
    ChatGoogleGenerativeAI,
} from '@langchain/google-genai';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';
import { PDFLoader } from '@langchain/community/document_loaders/fs/pdf';

interface ChunkMetadata {
    documentId: string;
    appointmentId?: string;
    providerId?: string;
    category?: string;
    tags?: string[];
    source: string;
    pageNumber: number;
    chunkIndex: number;
}

interface ChatFilters {
    appointmentId?: string;
    providerId?: string;
    category?: string;
    documentIds?: string[];
}

@Injectable()
export class RagService implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(RagService.name);
    private client: MongoClient;
    private vectorStore: MongoDBAtlasVectorSearch;
    private embeddings: GoogleGenerativeAIEmbeddings;
    private chatModel: ChatGoogleGenerativeAI;
    private collectionName: string;
    private dbName: string;

    constructor(
        private readonly config: ConfigService,
        private readonly httpService: HttpService,
    ) { }

    async onModuleInit(): Promise<void> {
        const googleApiKey = this.config.get<string>('GOOGLE_API_KEY');
        const mongoUri =
            this.config.get<string>('AI_MONGO_URI') ||
            this.config.get<string>('Mongo_Uri');
        this.dbName = this.config.get<string>('AI_DB_NAME') || 'lawyer_ai';
        this.collectionName =
            this.config.get<string>('AI_COLLECTION_NAME') || 'document_chunks';

        this.embeddings = new GoogleGenerativeAIEmbeddings({
            model: 'gemini-embedding-001',
            apiKey: googleApiKey,
        });

        this.chatModel = new ChatGoogleGenerativeAI({
            model: 'gemini-2.5-flash',
            apiKey: googleApiKey,
            temperature: 0,
        });

        this.client = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000 });
        await this.client.connect();

        const collection = this.client
            .db(this.dbName)
            .collection(this.collectionName);

        this.vectorStore = new MongoDBAtlasVectorSearch(this.embeddings, {
            collection: collection as any,
            indexName: 'vector_index',
            textKey: 'text',
            embeddingKey: 'embedding',
        });

        await this.checkVectorIndex(collection);
    }

    private async checkVectorIndex(collection: any): Promise<void> {
        try {
            let found = false;
            try {
                const indexes = collection.listSearchIndexes();
                for await (const idx of indexes) {
                    if (idx.name === 'vector_index') {
                        found = true;
                        break;
                    }
                }
            } catch {
                this.logger.warn(
                    'Could not verify vector index — ensure it is created manually in Atlas UI',
                );
                return;
            }
            if (!found) {
                this.logger.warn('Vector index "vector_index" not found.');
                this.logger.warn(
                    `Create it in Atlas UI: DB="${this.dbName}", Collection="${this.collectionName}"`,
                );
                this.logger.warn(
                    'Type="vectorSearch", Name="vector_index", Path="embedding", Dimensions=768, Similarity="cosine"',
                );
            }
        } catch (err: any) {
            this.logger.error('Vector index check failed:', err.message);
        }
    }

    async onModuleDestroy(): Promise<void> {
        if (this.client) await this.client.close();
    }

    async processDocument(payload: {
        documentId: string;
        cloudinaryUrl: string;
        fileName: string;
        category?: string;
        tags?: string[];
        linkedAppointmentId?: string;
        linkedProviderId?: string;
    }): Promise<number> {
        if (payload.fileName.endsWith('.pdf')) {
            this.logger.log(
                `Downloading PDF from Cloudinary: ${payload.cloudinaryUrl}`,
            );

            const response = await firstValueFrom(
                this.httpService.get(payload.cloudinaryUrl, {
                    responseType: 'arraybuffer',
                }),
            );
            const pdfBuffer = Buffer.from(response.data);

            const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
            const loader = new PDFLoader(blob, {
                splitPages: true,
                parsedItemSeparator: '',
            });
            const pdfDocs = await loader.load();

            if (pdfDocs.length === 0) {
                this.logger.warn(
                    `No text extracted from PDF ${payload.documentId}, skipping`,
                );
                return 0;
            }

            const splitter = new RecursiveCharacterTextSplitter({
                chunkSize: 1000,
                chunkOverlap: 200,
            });

            const splitDocs = await splitter.splitDocuments(pdfDocs);

            const docs = splitDocs.map((doc, i) => {
                const metadata: ChunkMetadata = {
                    documentId: payload.documentId,
                    source: payload.fileName,
                    pageNumber: doc.metadata?.loc?.pageNumber ?? 1,
                    chunkIndex: i,
                };
                if (payload.linkedAppointmentId)
                    metadata.appointmentId = payload.linkedAppointmentId;
                if (payload.linkedProviderId)
                    metadata.providerId = payload.linkedProviderId;
                if (payload.category) metadata.category = payload.category;
                if (payload.tags?.length) metadata.tags = payload.tags;

                return new Document({
                    pageContent: doc.pageContent,
                    metadata,
                });
            });

            await this.vectorStore.addDocuments(docs);
            this.logger.log(
                `Stored ${docs.length} chunks for document ${payload.documentId}`,
            );
            return docs.length;
        }

        this.logger.warn(`Non-PDF file ${payload.fileName} skipped by AI service`);
        return 0;
    }

    async deleteDocumentChunks(documentId: string): Promise<number> {
        const collection = this.client
            .db(this.dbName)
            .collection(this.collectionName);
        const result = await collection.deleteMany({
            'metadata.documentId': documentId,
        });
        this.logger.log(
            `Deleted ${result.deletedCount} chunks for document ${documentId}`,
        );
        return result.deletedCount;
    }

    async similaritySearch(
        query: string,
        k = 5,
        filters?: ChatFilters,
    ): Promise<Document[]> {
        const preFilter: Record<string, any> = {};

        if (filters?.appointmentId) {
            preFilter['appointmentId'] = { $eq: filters.appointmentId };
        }
        if (filters?.providerId) {
            preFilter['providerId'] = { $eq: filters.providerId };
        }
        if (filters?.category) {
            preFilter['category'] = { $eq: filters.category };
        }
        if (filters?.documentIds?.length) {
            preFilter['documentId'] = { $in: filters.documentIds };
        }

        return this.vectorStore.similaritySearch(query, k, preFilter);
    }

    async generateAnswer(question: string, context: string): Promise<string> {
        const systemPrompt = `You are an AI assistant for a legal document management system.

Answer ONLY using the provided context.

If the answer cannot be found inside the context, reply:
"I couldn't find that information in the uploaded documents."

Do not hallucinate.`;

        const chatPrompt = PromptTemplate.fromTemplate(`\
${systemPrompt}

Context:
{context}

Question:
{question}

Answer:
`);

        const chain = chatPrompt
            .pipe(this.chatModel)
            .pipe(new StringOutputParser());
        return chain.invoke({ context, question });
    }
}
