import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type ForumCommentDocument = HydratedDocument<ForumComment>;

@Schema({ timestamps: true })
export class ForumComment {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'ForumPost', required: true })
  postId: mongoose.Schema.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'ForumComment', default: null })
  parentId?: mongoose.Schema.Types.ObjectId | null;

  @Prop({ required: true })
  content: string;

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

  @Prop({ type: [mongoose.Schema.Types.ObjectId], ref: 'User', default: [] })
  likedBy: mongoose.Types.ObjectId[];
}

export const ForumCommentSchema = SchemaFactory.createForClass(ForumComment);


