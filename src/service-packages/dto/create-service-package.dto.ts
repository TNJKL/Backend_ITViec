import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { JOB_TAGS } from 'src/common/constants/job-tags.constant';

export class CreateServicePackageDto {
  @IsNotEmpty({ message: 'Tên gói không được để trống' })
  @IsString({ message: 'Tên gói phải là một chuỗi' })
  name: string;

  @IsNotEmpty({ message: 'Giá không được để trống' })
  @IsNumber({}, { message: 'Giá phải là một số' })
  @Min(0, { message: 'Giá phải lớn hơn hoặc bằng 0' })
  price: number;

  @IsNotEmpty({ message: 'Số lượng job tối đa không được để trống' })
  @IsNumber({}, { message: 'Số lượng job tối đa phải là một số' })
  @Min(1, { message: 'Số lượng job tối đa phải lớn hơn 0' })
  maxJobs: number;

  @IsNotEmpty({ message: 'Thời hạn (ngày) không được để trống' })
  @IsNumber({}, { message: 'Thời hạn phải là một số' })
  @Min(1, { message: 'Thời hạn phải lớn hơn 0' })
  durationDays: number;

  @IsOptional()
  @IsBoolean({ message: 'Trạng thái hoạt động phải là boolean' })
  isActive?: boolean;

  @IsOptional()
  @IsArray({ message: 'Danh sách tag hỗ trợ phải là một mảng' })
  @ArrayNotEmpty({ message: 'Danh sách tag hỗ trợ không được để trống', each: false })
  @ArrayUnique({ message: 'Tag hỗ trợ không được trùng nhau' })
  @IsIn(JOB_TAGS, {
    each: true,
    message: `Tag hỗ trợ phải thuộc một trong các giá trị: ${JOB_TAGS.join(', ')}`,
  })
  supportedTags?: string[];
}

