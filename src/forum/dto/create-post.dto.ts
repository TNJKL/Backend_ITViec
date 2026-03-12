import { IsArray, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreatePostDto {
  @IsString()
  @IsNotEmpty({ message: 'Tiêu đề không được để trống' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Nội dung không được để trống' })
  content: string;

  @IsArray()
  @IsOptional()
  images?: string[];
}






