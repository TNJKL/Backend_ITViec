import { Module } from '@nestjs/common';
import { ForumService } from './forum.service';
import { ForumController } from './forum.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ForumPost, ForumPostSchema } from './schemas/post.schema';
import { ForumComment, ForumCommentSchema } from './schemas/comment.schema';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ForumPost.name, schema: ForumPostSchema },
      { name: ForumComment.name, schema: ForumCommentSchema },
    ]),
    UsersModule,
  ],
  controllers: [ForumController],
  providers: [ForumService],
})
export class ForumModule {}


