import {
  Controller,
  Get,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { ResponseMessage, User } from 'src/decorator/customize';
import { IUser } from 'src/users/users.interface';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ResponseMessage('Lấy danh sách thông báo của user')
  findAll(
    @User() user: IUser,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    return this.notificationsService.findByUser(user, {
      limit: limit ? +limit : undefined,
      unreadOnly: unreadOnly === 'true',
    });
  }

  @Get('unread-count')
  @ResponseMessage('Đếm số thông báo chưa đọc')
  getUnreadCount(@User() user: IUser) {
    return this.notificationsService.countUnread(user);
  }

  @Patch(':id/read')
  @ResponseMessage('Đánh dấu thông báo đã đọc')
  markAsRead(@Param('id') id: string, @User() user: IUser) {
    return this.notificationsService.markAsRead(id, user);
  }

  @Patch('read-all')
  @ResponseMessage('Đánh dấu tất cả thông báo đã đọc')
  markAllAsRead(@User() user: IUser) {
    return this.notificationsService.markAllAsRead(user);
  }

  @Delete(':id')
  @ResponseMessage('Xóa thông báo')
  remove(@Param('id') id: string, @User() user: IUser) {
    return this.notificationsService.remove(id, user);
  }

  @Delete('read-all')
  @ResponseMessage('Xóa tất cả thông báo đã đọc')
  removeAllRead(@User() user: IUser) {
    return this.notificationsService.removeAllRead(user);
  }
}





