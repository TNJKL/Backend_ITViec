import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';

class EducationDto {
  @IsOptional()
  @IsString()
  school?: string;

  @IsOptional()
  @IsString()
  degree?: string;

  @IsOptional()
  @IsString()
  major?: string;

  @IsOptional()
  @IsBoolean()
  currentlyStudying?: boolean;

  @IsOptional()
  @IsDateString()
  from?: Date | string;

  @IsOptional()
  @IsDateString()
  to?: Date | string;

  @IsOptional()
  @IsString()
  details?: string;
}

class ExperienceDto {
  @IsOptional()
  @IsString()
  position?: string;

  @IsOptional()
  @IsString()
  companyName?: string;

  @IsOptional()
  @IsDateString()
  from?: Date | string;

  @IsOptional()
  @IsDateString()
  to?: Date | string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  projects?: string;
}

class LanguageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  level?: string;
}

class ProjectDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  from?: Date | string;

  @IsOptional()
  @IsDateString()
  to?: Date | string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  website?: string;
}

class CertificateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  organization?: string;

  @IsOptional()
  @IsDateString()
  from?: Date | string;

  @IsOptional()
  @IsDateString()
  to?: Date | string;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

class AwardDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  organization?: string;

  @IsOptional()
  @IsDateString()
  date?: Date | string;

  @IsOptional()
  @IsString()
  description?: string;
}

class SkillsDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  core?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  soft?: string[];
}

// Dùng cho user tự cập nhật hồ sơ: không cho phép cập nhật password và role
export class UpdateSelfDto extends PartialType(
  OmitType(CreateUserDto, ['password', 'role'] as const),
){
  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  aboutMe?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  education?: EducationDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experience?: ExperienceDto[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => SkillsDto)
  skills?: SkillsDto;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LanguageDto)
  languages?: LanguageDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProjectDto)
  projects?: ProjectDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificateDto)
  certificates?: CertificateDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AwardDto)
  awards?: AwardDto[];
}


