import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Resume } from 'src/resumes/schemas/resume.schema';
import { Job } from 'src/jobs/schemas/job.schema';
import { User } from 'src/users/schemas/user.schema';

export type InterviewDocument = HydratedDocument<Interview>;

@Schema({ timestamps: true })
export class Interview {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Resume.name, required: true })
  resumeId: mongoose.Schema.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: Job.name, required: true })
  jobId: mongoose.Schema.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: true })
  candidateId: mongoose.Schema.Types.ObjectId; // Ứng viên

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: User.name, required: true })
  interviewerId: mongoose.Schema.Types.ObjectId; // HR/Interviewer

  @Prop({ required: true })
  scheduledDate: Date; // Ngày giờ phỏng vấn

  @Prop()
  location?: string; // Địa điểm (hoặc link meeting nếu online)

  @Prop({ default: 'OFFLINE', enum: ['OFFLINE', 'ONLINE', 'HYBRID'] })
  interviewType: string;

  @Prop()
  meetingLink?: string; // Link Zoom/Meet nếu online

  @Prop()
  notes?: string; // Ghi chú cho ứng viên

  @Prop({
    default: 'SCHEDULED',
    enum: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED', 'COMPLETED', 'CANCELLED'],
  })
  status: string;

  @Prop({ enum: ['PASSED', 'FAILED', 'PENDING'] })
  result?: string; // Kết quả sau khi phỏng vấn

  @Prop()
  feedback?: string; // Nhận xét sau phỏng vấn

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

  @Prop()
  isDeleted: boolean;

  @Prop()
  deletedAt: Date;

  @Prop()
  cancelReason?: string;

  @Prop()
  cancelledAt?: Date;
}

export const InterviewSchema = SchemaFactory.createForClass(Interview);



