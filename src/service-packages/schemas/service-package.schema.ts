import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type ServicePackageDocument = HydratedDocument<ServicePackage>;

@Schema({ timestamps: true })
export class ServicePackage {
  @Prop({ required: true })
  name: string; // Tên gói (Basic, Pro, Premium)

  @Prop({ required: true })
  price: number; // Giá tiền

  @Prop({ required: true })
  maxJobs: number; // Giới hạn số job được đăng

  @Prop({ required: true })
  durationDays: number; // Thời hạn hiệu lực (ngày)

  @Prop({ type: [String], default: ['New'] })
  supportedTags: string[];

  @Prop({ default: true })
  isActive: boolean; // Gói còn được bán hay không

  @Prop({ type: Object })
  createdBy: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };

  @Prop({ type: Object })
  updatedBy: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };

  @Prop({ type: Object })
  deletedBy: {
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

export const ServicePackageSchema = SchemaFactory.createForClass(ServicePackage);

