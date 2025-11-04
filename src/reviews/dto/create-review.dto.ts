import { IsBoolean, IsIn, IsMongoId, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import mongoose from 'mongoose';

export class CreateReviewDto {
  @IsNotEmpty()
  @IsMongoId()
  company: mongoose.Schema.Types.ObjectId;

  @IsNotEmpty()
  @IsMongoId()
  user: mongoose.Schema.Types.ObjectId;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsIn(['SATISFIED', 'UNSATISFIED'])
  overtimePolicy?: 'SATISFIED' | 'UNSATISFIED';

  @IsOptional()
  @IsString()
  pros?: string;

  @IsOptional()
  @IsString()
  cons?: string;

  @IsOptional()
  @IsBoolean()
  recommend?: boolean;
}


