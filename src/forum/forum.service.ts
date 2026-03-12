import { BadRequestException, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { ForumPost, ForumPostDocument } from './schemas/post.schema';
import { ForumComment, ForumCommentDocument } from './schemas/comment.schema';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { IUser } from 'src/users/users.interface';
import mongoose from 'mongoose';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class ForumService {
  constructor(
    @InjectModel(ForumPost.name) private postModel: SoftDeleteModel<ForumPostDocument>,
    @InjectModel(ForumComment.name) private commentModel: SoftDeleteModel<ForumCommentDocument>,
    private usersService: UsersService,
  ) {}

  async createPost(dto: CreatePostDto, user: IUser) {
    const dbUser: any = await this.usersService.findOne(user._id.toString());
    const post = await this.postModel.create({
      title: dto.title,
      content: dto.content,
      images: dto.images || [],
      author: {
        _id: dbUser?._id || user._id,
        name: dbUser?.name || user.name,
        email: dbUser?.email || user.email,
        avatar: dbUser?.avatar || '',
      },
      status: 'pending',
    });
    return { _id: post._id, status: post.status };
  }

  async findPosts(currentPage: number, limitPage: number, status: string) {
    const filter: any = {};
    if (status === 'all') {
      // không filter status => lấy tất cả
    } else if (status) {
      filter.status = status;
    } else {
      // mặc định cho client: chỉ lấy bài đã duyệt
      filter.status = 'approved';
    }
    const totalItems = await this.postModel.countDocuments(filter);
    const posts = await this.postModel
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * limitPage)
      .limit(limitPage);

    // Bổ sung avatar nếu thiếu (cho các bài cũ)
    const mapped = await Promise.all(
      posts.map(async (post) => {
        const obj: any = post.toObject();
        if (!obj.author?.avatar && obj.author?._id) {
          const u: any = await this.usersService.findOne(obj.author._id.toString());
          obj.author.avatar = u?.avatar || '';
        }
        return obj;
      }),
    );

    return {
      meta: {
        current: currentPage,
        pageSize: limitPage,
        total: totalItems,
      },
      result: mapped,
    };
  }

  async findOnePost(id: string, viewer?: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Id không hợp lệ');
    }
    const post = await this.postModel.findById(id);
    if (!post) throw new NotFoundException('Không tìm thấy bài viết');
    if (post.status !== 'approved' && (!viewer || (viewer as any).role?.name !== 'ADMIN')) {
      throw new BadRequestException('Bài viết chưa được duyệt');
    }
    const obj: any = post.toObject();
    if (!obj.author?.avatar && obj.author?._id) {
      const u: any = await this.usersService.findOne(obj.author._id.toString());
      obj.author.avatar = u?.avatar || '';
    }
    return obj;
  }

  async toggleLikePost(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Id không hợp lệ');
    }
    const post = await this.postModel.findById(id);
    if (!post) throw new NotFoundException('Không tìm thấy bài viết');
    const userId = new mongoose.Types.ObjectId(user._id);
    const index = post.likedBy.findIndex((u) => u.toString() === userId.toString());
    if (index >= 0) {
      post.likedBy.splice(index, 1);
    } else {
      post.likedBy.push(userId);
    }
    await post.save();
    return { _id: post._id, likes: post.likedBy.length };
  }

  async updatePost(id: string, dto: UpdatePostDto, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Id không hợp lệ');
    }
    const post = await this.postModel.findById(id);
    if (!post) throw new NotFoundException('Không tìm thấy bài viết');

    const isOwner = post.author._id.toString() === user._id.toString();
    const isAdmin = (user as any).role?.name === 'ADMIN' || (user as any).role?.name === 'SUPER_ADMIN';
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Bạn không có quyền sửa bài viết này');
    }

    if (dto.title !== undefined) post.title = dto.title;
    if (dto.content !== undefined) post.content = dto.content;
    if (dto.images !== undefined) post.images = dto.images;

    await post.save();
    return post;
  }

  async deletePost(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Id không hợp lệ');
    }
    const post = await this.postModel.findById(id);
    if (!post) throw new NotFoundException('Không tìm thấy bài viết');

    const isOwner = post.author._id.toString() === user._id.toString();
    const isAdmin = (user as any).role?.name === 'ADMIN' || (user as any).role?.name === 'SUPER_ADMIN';
    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Bạn không có quyền xoá bài viết này');
    }

    await this.postModel.deleteOne({ _id: id } as any);
    return { _id: id, deleted: true };
  }

  async createComment(postId: string, dto: CreateCommentDto, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('Id bài viết không hợp lệ');
    }
    const post = await this.postModel.findById(postId);
    if (!post) throw new NotFoundException('Không tìm thấy bài viết');

    let parentId: mongoose.Types.ObjectId | null = null;
    if (dto.parentId) {
      if (!mongoose.Types.ObjectId.isValid(dto.parentId)) {
        throw new BadRequestException('Id bình luận cha không hợp lệ');
      }
      const parent = await this.commentModel.findById(dto.parentId);
      if (!parent) throw new NotFoundException('Không tìm thấy bình luận cha');
      parentId = parent._id;
    }

    const dbUser: any = await this.usersService.findOne(user._id.toString());
    const comment = await this.commentModel.create({
      postId: post._id,
      parentId,
      content: dto.content,
      author: {
        _id: dbUser?._id || user._id,
        name: dbUser?.name || user.name,
        email: dbUser?.email || user.email,
        avatar: dbUser?.avatar || '',
      },
    });
    return comment;
  }

  async findComments(postId: string) {
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      throw new BadRequestException('Id bài viết không hợp lệ');
    }
    const comments = await this.commentModel
      .find({ postId })
      .sort({ createdAt: 1 });
    
    // Chuyển đổi sang nested structure
    const commentMap = new Map();
    const rootComments: any[] = [];

    // Tạo map cho tất cả comments
    comments.forEach((comment) => {
      const obj: any = comment.toObject();
      obj.replies = [];
      commentMap.set(obj._id.toString(), obj);
    });

    // Xây dựng cây nested - sử dụng object từ map
    commentMap.forEach((comment) => {
      if (!comment.parentId) {
        rootComments.push(comment);
      } else {
        const parentIdStr = comment.parentId.toString();
        const parent = commentMap.get(parentIdStr);
        if (parent) {
          parent.replies = parent.replies || [];
          parent.replies.push(comment);
        } else {
          // Nếu parent không tồn tại, coi như root comment
          rootComments.push(comment);
        }
      }
    });

    // Sắp xếp lại replies theo thời gian
    const sortReplies = (comment: any) => {
      if (comment.replies && comment.replies.length > 0) {
        comment.replies.sort((a: any, b: any) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        comment.replies.forEach((reply: any) => sortReplies(reply));
      }
    };
    rootComments.forEach(comment => sortReplies(comment));

    return rootComments;
  }

  async toggleLikeComment(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Id không hợp lệ');
    }
    const comment = await this.commentModel.findById(id);
    if (!comment) throw new NotFoundException('Không tìm thấy bình luận');
    const userId = new mongoose.Types.ObjectId(user._id);
    const index = comment.likedBy.findIndex((u) => u.toString() === userId.toString());
    if (index >= 0) {
      comment.likedBy.splice(index, 1);
    } else {
      comment.likedBy.push(userId);
    }
    await comment.save();
    return { _id: comment._id, likes: comment.likedBy.length };
  }

  async approvePost(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Id không hợp lệ');
    }
    const post = await this.postModel.findById(id);
    if (!post) throw new NotFoundException('Không tìm thấy bài viết');
    post.status = 'approved';
    await post.save();
    return { _id: post._id, status: post.status };
  }

  async rejectPost(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Id không hợp lệ');
    }
    const post = await this.postModel.findById(id);
    if (!post) throw new NotFoundException('Không tìm thấy bài viết');
    post.status = 'rejected';
    await post.save();
    return { _id: post._id, status: post.status };
  }
}


