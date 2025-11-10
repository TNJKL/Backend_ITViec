import { IsNotEmpty } from 'class-validator';

export class UpdateResumeFileDto {
  @IsNotEmpty({ message: 'url không được để trống' })
  url: string;
}

