import {
  IsString,
  IsOptional,
  IsArray,
  IsEnum,
  IsMongoId,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDocumentDto {
  @IsString()
  fileName: string;

  @IsString()
  mimeType: string;

  @IsNumber()
  sizeBytes: number;

  @IsOptional()
  @IsEnum(['policy', 'faq', 'case_file', 'intake_form', 'contract', 'other'])
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsMongoId()
  linkedProviderId?: string;

  @IsOptional()
  @IsMongoId()
  linkedAppointmentId?: string;
}

export class UpdateDocumentDto {
  @IsOptional()
  @IsEnum(['policy', 'faq', 'case_file', 'intake_form', 'contract', 'other'])
  category?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class ListDocumentsDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  tag?: string;

  @IsOptional()
  @IsMongoId()
  ownerId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}
