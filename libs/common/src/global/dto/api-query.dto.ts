import { IsNumber, IsOptional, IsString } from 'class-validator';

export class ApiQueryDto {
  @IsNumber()
  @IsOptional()
  page?: number;

  @IsNumber()
  @IsOptional()
  limit?: number;

  @IsString()
  @IsOptional()
  select?: string;

  @IsString()
  @IsOptional()
  sort: string;
}
