import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type ForumPostDocument = HydratedDocument<ForumPost>;

@Schema({ timestamps: true })
export class ForumPost {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({
    type: {
      _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      name: String,
      email: String,
      avatar: String,
    },
    required: true,
  })
  author: {
    _id: mongoose.Schema.Types.ObjectId;
    name: string;
    email: string;
    avatar?: string;
  };

  @Prop({ enum: ['pending', 'approved', 'rejected'], default: 'pending' })
  status: string;

  @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] })
  likedBy: mongoose.Types.ObjectId[];
}

export const ForumPostSchema = SchemaFactory.createForClass(ForumPost);

