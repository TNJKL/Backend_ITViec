import { OmitType, PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

// Dùng cho user tự cập nhật hồ sơ: không cho phép cập nhật password và role
export class UpdateSelfDto extends PartialType(
  OmitType(CreateUserDto, ['password', 'role'] as const),
) {}


