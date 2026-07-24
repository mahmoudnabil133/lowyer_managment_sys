import {
  IsString,
  IsNumber,
  IsMongoId,
  Min,
  Max,
  MaxLength,
  IsOptional,
} from 'class-validator';

export class CreateReviewDto {
  @IsMongoId()
  appointmentId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comment?: string;
}
