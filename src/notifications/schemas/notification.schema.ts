import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { User } from 'src/users/schemas/user.schema';

export type NotificationDocument = HydratedDocument<Notification>;

@Schema({ timestamps: true })
export class Notification {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: true })
  userId: mongoose.Schema.Types.ObjectId; // Người nhận thông báo

  @Prop({ required: true })
  title: string; // Tiêu đề thông báo

  @Prop({ required: true })
  message: string; // Nội dung thông báo

  @Prop({
    required: true,
    enum: [
      'INTERVIEW_SCHEDULED',
      'INTERVIEW_CONFIRMED',
      'INTERVIEW_RESCHEDULED',
      'INTERVIEW_CANCELLED',
      'RESUME_APPROVED',
      'RESUME_REJECTED',
      'OFFER_SENT',
      'SYSTEM',
      'OTHER',
    ],
  })
  type: string; // Loại thông báo

  @Prop({ default: false })
  isRead: boolean; // Đã đọc chưa

  @Prop()
  readAt?: Date; // Thời gian đọc

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Interview' })
  interviewId?: mongoose.Schema.Types.ObjectId; // Link đến interview (nếu có)

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Resume' })
  resumeId?: mongoose.Schema.Types.ObjectId; // Link đến resume (nếu có)

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Job' })
  jobId?: mongoose.Schema.Types.ObjectId; // Link đến job (nếu có)

  @Prop({ type: Object })
  metadata?: Record<string, any>; // Dữ liệu bổ sung

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

// Tạo index để query nhanh hơn
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });





