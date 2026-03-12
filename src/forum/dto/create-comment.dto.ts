import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty({ message: 'Nội dung bình luận không được để trống' })
  content: string;

  @IsString()
  @IsOptional()
  parentId?: string;
}






