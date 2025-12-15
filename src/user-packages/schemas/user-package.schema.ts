import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type UserPackageDocument = HydratedDocument<UserPackage>;

@Schema({ timestamps: true })
export class UserPackage {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: mongoose.Schema.Types.ObjectId; // User sở hữu gói

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'ServicePackage', required: true })
  packageId: mongoose.Schema.Types.ObjectId; // Gói dịch vụ

  @Prop({ required: true })
  startDate: Date; // Ngày bắt đầu

  @Prop({ required: true })
  endDate: Date; // Ngày kết thúc

  @Prop({ default: 0 })
  usedJobs: number; // Số job đã sử dụng trong thời hạn gói

  @Prop({ default: true })
  isActive: boolean; // Gói còn hiệu lực không

  @Prop({ type: Object })
  createdBy: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt: Date;
}

export const UserPackageSchema = SchemaFactory.createForClass(UserPackage);

