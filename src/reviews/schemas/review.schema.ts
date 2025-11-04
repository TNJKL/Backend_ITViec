import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type ReviewDocument = HydratedDocument<Review>;

@Schema({ timestamps: true })
export class Review {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true })
  company: mongoose.Schema.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  user: mongoose.Schema.Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop()
  comment: string;

  @Prop()
  summary: string;

  @Prop()
  overtimePolicy?: 'SATISFIED' | 'UNSATISFIED';

  @Prop()
  pros?: string;

  @Prop()
  cons?: string;

  @Prop({ default: false })
  recommend?: boolean;

  @Prop()
  createdAt: Date;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

