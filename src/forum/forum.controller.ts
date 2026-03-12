import { Body, Controller, Get, Param, Post, Query, Patch, Delete } from '@nestjs/common';
import { ForumService } from './forum.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { User, Public, ResponseMessage, SkipCheckPermission } from 'src/decorator/customize';
import { IUser } from 'src/users/users.interface';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('forum')
@Controller({ path: 'forum', version: '1' })
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  @Post('posts')
  @ResponseMessage('Tạo bài viết forum')
  createPost(@Body() dto: CreatePostDto, @User() user: IUser) {
    return this.forumService.createPost(dto, user);
  }

  @Public()
  @Get('posts')
  @ResponseMessage('Lấy danh sách bài viết forum')
  findPosts(
    @Query('current') currentPage: string,
    @Query('pageSize') limitPage: string,
    @Query('status') status: string,
  ) {
    return this.forumService.findPosts(+currentPage || 1, +limitPage || 10, status);
  }

  @Public()
  @Get('posts/:id')
  @ResponseMessage('Lấy chi tiết bài viết forum')
  findOne(@Param('id') id: string, @User() user?: IUser) {
    return this.forumService.findOnePost(id, user);
  }

  @Post('posts/:id/like')
  @ResponseMessage('Like/Unlike bài viết')
  toggleLikePost(@Param('id') id: string, @User() user: IUser) {
    return this.forumService.toggleLikePost(id, user);
  }

  @Post('posts/:postId/comments')
  @ResponseMessage('Tạo bình luận cho bài viết')
  createComment(
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
    @User() user: IUser,
  ) {
    return this.forumService.createComment(postId, dto, user);
  }

  @Public()
  @Get('posts/:postId/comments')
  @ResponseMessage('Lấy danh sách bình luận của bài viết')
  findComments(@Param('postId') postId: string) {
    return this.forumService.findComments(postId);
  }

  @Post('comments/:id/like')
  @ResponseMessage('Like/Unlike bình luận')
  toggleLikeComment(@Param('id') id: string, @User() user: IUser) {
    return this.forumService.toggleLikeComment(id, user);
  }

  @Post('posts/:id/approve')
  @ResponseMessage('Duyệt bài viết forum')
  approvePost(@Param('id') id: string) {
    return this.forumService.approvePost(id);
  }

  @Post('posts/:id/reject')
  @ResponseMessage('Từ chối bài viết forum')
  rejectPost(@Param('id') id: string) {
    return this.forumService.rejectPost(id);
  }

  @Patch('posts/:id')
  @SkipCheckPermission()
  @ResponseMessage('Cập nhật bài viết forum')
  updatePost(@Param('id') id: string, @Body() dto: UpdatePostDto, @User() user: IUser) {
    return this.forumService.updatePost(id, dto, user);
  }

  @Delete('posts/:id')
  @SkipCheckPermission()
  @ResponseMessage('Xoá bài viết forum')
  deletePost(@Param('id') id: string, @User() user: IUser) {
    return this.forumService.deletePost(id, user);
  }
}




