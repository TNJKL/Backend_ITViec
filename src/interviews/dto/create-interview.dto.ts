import { IsNotEmpty, IsMongoId, IsDateString, IsString, IsOptional, IsEnum } from 'class-validator';
import mongoose from 'mongoose';

export class CreateInterviewDto {
  @IsNotEmpty({ message: 'Resume ID không được để trống' })
  @IsMongoId({ message: 'Resume ID không hợp lệ' })
  resumeId: mongoose.Schema.Types.ObjectId;

  @IsNotEmpty({ message: 'Job ID không được để trống' })
  @IsMongoId({ message: 'Job ID không hợp lệ' })
  jobId: mongoose.Schema.Types.ObjectId;

  @IsNotEmpty({ message: 'Ngày giờ phỏng vấn không được để trống' })
  @IsDateString({}, { message: 'Ngày giờ phỏng vấn phải đúng định dạng' })
  scheduledDate: string;

  @IsOptional()
  @IsString({ message: 'Địa điểm phải là chuỗi' })
  location?: string;

  @IsOptional()
  @IsEnum(['OFFLINE', 'ONLINE', 'HYBRID'], {
    message: 'Loại phỏng vấn phải là OFFLINE, ONLINE hoặc HYBRID',
  })
  interviewType?: string;

  @IsOptional()
  @IsString({ message: 'Link meeting phải là chuỗi' })
  meetingLink?: string;

  @IsOptional()
  @IsString({ message: 'Ghi chú phải là chuỗi' })
  notes?: string;
}


