import { BadRequestException, Injectable } from '@nestjs/common';
import { Readable } from 'stream';
import {
  v2 as cloudinary,
  UploadApiOptions,
  UploadApiResponse,
} from 'cloudinary';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadService {
  constructor(private readonly config: ConfigService) {
    cloudinary.config({
      cloud_name: this.config.get<string>('CLOUDINARY_NAME'),
      api_key: this.config.get<string>('CLOUDINARY_KEY'),
      api_secret: this.config.get<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    });
  }

  async uploadFile(
    file: any,
  ): Promise<{ secureUrl: string; publicId: string }> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    if (file.buffer && !Buffer.isBuffer(file.buffer)) {
      if (file.buffer.type === 'Buffer' && Array.isArray(file.buffer.data)) {
        file.buffer = Buffer.from(file.buffer.data);
      }
    }

    const mimeType = file.mimetype;
    let resourceType: 'auto' | 'image' | 'video' | 'raw' = 'auto';

    if (mimeType.startsWith('image/')) {
      resourceType = 'image';
    } else if (mimeType.startsWith('audio/') || mimeType.startsWith('video/')) {
      resourceType = 'video';
    } else if (mimeType === 'application/pdf') {
      resourceType = 'raw';
    }

    const sanitizedName = file.originalname
      .split('.')[0]
      .replace(/[^\w\s]/gi, '')
      .replace(/\s+/g, '_');

    const uploadOptions: UploadApiOptions = {
      resource_type: resourceType,
      public_id: `${sanitizedName}_${Date.now()}`,
      overwrite: false,
      invalidate: true,
      type: 'upload',
      format: resourceType === 'raw' ? 'pdf' : undefined,
    };

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error: any, result: UploadApiResponse) => {
          if (error) {
            return reject(
              new BadRequestException(`Upload failed: ${error.message}`),
            );
          }
          resolve({ secureUrl: result.secure_url, publicId: result.public_id });
        },
      );

      const readableStream = Readable.from(file.buffer);
      readableStream.pipe(uploadStream);
    });
  }

  async deleteFile(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      throw new BadRequestException(`Failed to delete file: ${error.message}`);
    }
  }
}
