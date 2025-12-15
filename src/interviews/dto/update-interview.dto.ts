import { IsOptional, IsDateString, IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateInterviewDto {
  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  @IsDateString({}, { message: 'Ngày giờ phỏng vấn phải đúng định dạng' })
  scheduledDate?: Date;

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

  @IsOptional()
  @IsEnum(['SCHEDULED', 'CONFIRMED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED'], {
    message: 'Status không hợp lệ',
  })
  status?: string;
}

export class UpdateInterviewResultDto {
  @IsOptional()
  @IsEnum(['PASSED', 'FAILED', 'PENDING'], {
    message: 'Kết quả phải là PASSED, FAILED hoặc PENDING',
  })
  result?: string;

  @IsOptional()
  @IsString({ message: 'Feedback phải là chuỗi' })
  feedback?: string;
}

export class CancelInterviewDto {
  @IsNotEmpty({ message: 'Lý do hủy không được để trống' })
  @IsString({ message: 'Lý do hủy phải là chuỗi' })
  cancelReason: string;
}



