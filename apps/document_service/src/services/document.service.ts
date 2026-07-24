import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UploadService } from './upload.service';
import { CreateDocumentDto, UpdateDocumentDto } from '../dtos/document.dto';
import { Document } from '../models/document.schema';

@Injectable()
export class DocumentService {
  private readonly logger = new Logger(DocumentService.name);

  constructor(
    @InjectModel(Document.name)
    private readonly documentModel: Model<Document>,
    private readonly uploadService: UploadService,
  ) {}

  async create(
    ownerId: string,
    ownerRole: string,
    file: any,
    dto: CreateDocumentDto,
  ) {
    const { secureUrl, publicId } = await this.uploadService.uploadFile(file);

    const document = await this.documentModel.create({
      ownerId: new Types.ObjectId(ownerId),
      ownerRole,
      fileName: dto.fileName,
      originalName: file.originalname,
      mimeType: dto.mimeType,
      sizeBytes: dto.sizeBytes,
      cloudinaryUrl: secureUrl,
      cloudinaryPublicId: publicId,
      category: dto.category || 'other',
      tags: dto.tags || [],
      linkedProviderId: dto.linkedProviderId
        ? new Types.ObjectId(dto.linkedProviderId)
        : undefined,
      linkedAppointmentId: dto.linkedAppointmentId
        ? new Types.ObjectId(dto.linkedAppointmentId)
        : undefined,
      extractionStatus: 'pending',
    });

    return document;
  }

  async findById(documentId: string) {
    const doc = await this.documentModel.findById(documentId);
    if (!doc) throw new NotFoundException('Document not found');
    return doc;
  }

  async list(query: any) {
    const filter: any = {};
    if (query.category) filter.category = query.category;
    if (query.tag) filter.tags = { $in: [query.tag] };
    if (query.ownerId) filter.ownerId = new Types.ObjectId(query.ownerId);

    const page = query.page || 1;
    const limit = Math.min(query.limit || 10, 50);
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.documentModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.documentModel.countDocuments(filter),
    ]);

    return {
      results: data.length,
      totalDocuments: total,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      data,
    };
  }

  async update(documentId: string, dto: UpdateDocumentDto) {
    const updated = await this.documentModel.findByIdAndUpdate(
      documentId,
      { $set: dto },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Document not found');
    return updated;
  }

  async updateExtractionStatus(
    documentId: string,
    status: 'processed' | 'failed',
  ) {
    const updated = await this.documentModel.findByIdAndUpdate(
      documentId,
      { $set: { extractionStatus: status } },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Document not found');
    return updated;
  }

  async delete(documentId: string) {
    const doc = await this.documentModel.findById(documentId);
    if (!doc) throw new NotFoundException('Document not found');

    await this.uploadService.deleteFile(doc.cloudinaryPublicId).catch((err) => {
      this.logger.warn(`Failed to delete from Cloudinary: ${err.message}`);
    });
    await this.documentModel.findByIdAndDelete(documentId);

    return { deleted: true };
  }

  async getDownloadUrl(documentId: string) {
    const doc = await this.findById(documentId);
    return { url: doc.cloudinaryUrl, fileName: doc.originalName };
  }
}
