import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import mongoose from 'mongoose';
import { IUser } from 'src/users/users.interface';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectModel(Notification.name)
    private notificationModel: SoftDeleteModel<NotificationDocument>,
  ) {}

  /**
   * Tạo thông báo mới
   */
  async create(notificationData: {
    userId: string | mongoose.Types.ObjectId;
    title: string;
    message: string;
    type: string;
    interviewId?: string | mongoose.Types.ObjectId;
    resumeId?: string | mongoose.Types.ObjectId;
    jobId?: string | mongoose.Types.ObjectId;
    metadata?: Record<string, any>;
  }) {
    const notification = await this.notificationModel.create({
      userId: new mongoose.Types.ObjectId(notificationData.userId as any),
      title: notificationData.title,
      message: notificationData.message,
      type: notificationData.type,
      isRead: false,
      interviewId: notificationData.interviewId
        ? new mongoose.Types.ObjectId(notificationData.interviewId as any)
        : undefined,
      resumeId: notificationData.resumeId
        ? new mongoose.Types.ObjectId(notificationData.resumeId as any)
        : undefined,
      jobId: notificationData.jobId
        ? new mongoose.Types.ObjectId(notificationData.jobId as any)
        : undefined,
      metadata: notificationData.metadata || {},
    });

    return notification;
  }

  /**
   * Lấy danh sách thông báo của user
   */
  async findByUser(
    user: IUser,
    options?: { limit?: number; unreadOnly?: boolean },
  ) {
    const { limit = 50, unreadOnly = false } = options || {};

    const filter: any = {
      userId: new mongoose.Types.ObjectId(user._id as any),
    };

    if (unreadOnly) {
      filter.isRead = false;
    }

    return await this.notificationModel
      .find(filter)
      .sort('-createdAt')
      .limit(limit)
      .populate('interviewId')
      .populate('resumeId')
      .populate('jobId', 'name company')
      .exec();
  }

  /**
   * Đánh dấu thông báo đã đọc
   */
  async markAsRead(notificationId: string, user: IUser) {
    const notification = await this.notificationModel.findOne({
      _id: new mongoose.Types.ObjectId(notificationId),
      userId: new mongoose.Types.ObjectId(user._id as any),
    });

    if (!notification) {
      throw new Error('Không tìm thấy thông báo');
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return notification;
  }

  /**
   * Đánh dấu tất cả thông báo đã đọc
   */
  async markAllAsRead(user: IUser) {
    return await this.notificationModel.updateMany(
      {
        userId: new mongoose.Types.ObjectId(user._id as any),
        isRead: false,
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
        },
      },
    );
  }

  /**
   * Đếm số thông báo chưa đọc
   */
  async countUnread(user: IUser): Promise<number> {
    return await this.notificationModel.countDocuments({
      userId: new mongoose.Types.ObjectId(user._id as any),
      isRead: false,
    });
  }

  /**
   * Xóa thông báo
   */
  async remove(notificationId: string, user: IUser) {
    const notification = await this.notificationModel.findOne({
      _id: new mongoose.Types.ObjectId(notificationId),
      userId: new mongoose.Types.ObjectId(user._id as any),
    });

    if (!notification) {
      throw new Error('Không tìm thấy thông báo');
    }

    return await this.notificationModel.softDelete({
      _id: notificationId,
    });
  }

  /**
   * Xóa tất cả thông báo đã đọc
   */
  async removeAllRead(user: IUser) {
    return await this.notificationModel.updateMany(
      {
        userId: new mongoose.Types.ObjectId(user._id as any),
        isRead: true,
      },
      {
        isDeleted: true,
        deletedAt: new Date(),
      },
    );
  }
}





