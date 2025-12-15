import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePaymentDto {
  @IsNotEmpty({ message: 'Gói dịch vụ không được để trống' })
  @IsString({ message: 'Gói dịch vụ phải là một chuỗi' })
  packageId: string;
}



