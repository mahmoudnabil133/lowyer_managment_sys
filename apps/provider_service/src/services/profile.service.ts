import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ProviderProfile, ProviderProfileDocument } from "../models/provider-profile.schema";
import { Model, Types } from "mongoose";
import { CreateProfileDto, CredentialDto, UpdateProfileDto } from "../dtos/profile.dto";
import { ApiFeatureService } from "@app/common";

@Injectable()
export class ProfileService {
    constructor(
        @InjectModel(ProviderProfile.name) private readonly profileModel: Model<ProviderProfileDocument>,
    ) { }

    async create(userId: string, dto: CreateProfileDto) {
        const existing = await this.profileModel.findOne({ userId })
        if (existing) {
            throw new ConflictException(`profile already exits for this user`)
        }
        const profile = await this.profileModel.create({
            userId: new Types.ObjectId(userId),
            ...dto
        })
        return profile
    }

    async findById(id: string) {
        const profile = await this.profileModel.findById(id);
        if (!profile) throw new NotFoundException('Provider profile not found');
        return profile;
    }


    async findByUserId(userId: string) {
        return this.profileModel.findOne({ userId: new Types.ObjectId(userId) });
    }
    async update(id: string, userId: string, dto: UpdateProfileDto) {
        const profile = await this.findById(id);
        if (profile.userId.toString() !== userId) {
            throw new ForbiddenException('You can only update your own profile');
        }
        Object.assign(profile, dto);
        return profile.save();
    }

    async updateByUserId(userId: string, dto: UpdateProfileDto) {
        const profile = await this.profileModel.findOneAndUpdate(
            { userId: new Types.ObjectId(userId) },
            { $set: dto },
            { new: true },
        );
        if (!profile) throw new NotFoundException('Provider profile not found');
        return profile;
    }

    async list(query: any) {
        const features = new ApiFeatureService(
            query,
            this.profileModel
        )
            .filter()
            .sort()
            .select()
            .paginate();
        return features.execute();
    }

    async getMe(userId: string) {
        let profile = await this.profileModel.findOne({
            userId: new Types.ObjectId(userId),
        });
        if (!profile) {
            // Return empty template for profile creation
            return null;
        }
        return profile;
    }

    async addCredential(userId: string, credential: CredentialDto) {
        const profile = await this.profileModel.findOne({ userId: new Types.ObjectId(userId) });
        if (!profile) throw new NotFoundException('Profile not found');
        profile.credentials.push(credential as any);
        return profile.save();
    }


    async listUnverifiedCredentials() {
        return this.profileModel.find(
            { 'credentials.verified': false },
            { 'credentials.$': 1, fullName: 1, userId: 1 },
        );
    }

    async verifyCredential(profileId: string, credId: string, adminUserId: string) {
        const profile = await this.profileModel.findOneAndUpdate(
            {
                _id: new Types.ObjectId(profileId),
                'credentials._id': new Types.ObjectId(credId),
            },
            {
                $set: {
                    'credentials.$.verified': true,
                    'credentials.$.verifiedBy': new Types.ObjectId(adminUserId),
                    'credentials.$.verifiedAt': new Date(),
                },
            },
            { new: true },
        );
        if (!profile) throw new NotFoundException('Profile or credential not found');
        return profile;
    }
}