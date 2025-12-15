import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { InterviewsService } from './interviews.service';
import { CreateInterviewDto } from './dto/create-interview.dto';
import {
  UpdateInterviewDto,
  UpdateInterviewResultDto,
  CancelInterviewDto,
} from './dto/update-interview.dto';
import { ResponseMessage, User } from 'src/decorator/customize';
import { IUser } from 'src/users/users.interface';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('interviews')
@Controller('interviews')
export class InterviewsController {
  constructor(private readonly interviewsService: InterviewsService) {}

  @Post()
  @ResponseMessage('Tạo lịch phỏng vấn mới')
  create(@Body() createInterviewDto: CreateInterviewDto, @User() user: IUser) {
    return this.interviewsService.create(createInterviewDto, user);
  }

  @Get()
  @ResponseMessage('Lấy danh sách lịch phỏng vấn (có phân trang)')
  findAll(
    @Query('current') currentPage: string,
    @Query('pageSize') limitPage: string,
    @Query() queryString: string,
    @User() user?: IUser,
  ) {
    return this.interviewsService.findAll(
      +currentPage,
      +limitPage,
      queryString,
      user,
    );
  }

  @Get('my-interviews')
  @ResponseMessage('Lấy danh sách lịch phỏng vấn của ứng viên')
  getMyInterviews(@User() user: IUser) {
    return this.interviewsService.getMyInterviews(user);
  }

  @Get('manage')
  @ResponseMessage('Lấy danh sách lịch phỏng vấn (quản lý)')
  findAllManaged(
    @Query('current') currentPage: string,
    @Query('pageSize') limitPage: string,
    @Query() queryString: string,
    @User() user: IUser,
  ) {
    return this.interviewsService.findAll(
      +currentPage,
      +limitPage,
      queryString,
      user,
    );
  }

  @Get(':id')
  @ResponseMessage('Lấy chi tiết lịch phỏng vấn')
  findOne(@Param('id') id: string, @User() user?: IUser) {
    return this.interviewsService.findOne(id, user);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật lịch phỏng vấn')
  update(
    @Param('id') id: string,
    @Body() updateInterviewDto: UpdateInterviewDto,
    @User() user: IUser,
  ) {
    return this.interviewsService.update(id, updateInterviewDto, user);
  }

  @Patch(':id/confirm')
  @ResponseMessage('Ứng viên xác nhận tham gia phỏng vấn')
  confirm(@Param('id') id: string, @User() user: IUser) {
    return this.interviewsService.confirm(id, user);
  }

  @Patch(':id/result')
  @ResponseMessage('HR cập nhật kết quả phỏng vấn')
  updateResult(
    @Param('id') id: string,
    @Body() updateResultDto: UpdateInterviewResultDto,
    @User() user: IUser,
  ) {
    return this.interviewsService.updateResult(id, updateResultDto, user);
  }

  @Delete(':id')
  @ResponseMessage('Hủy lịch phỏng vấn')
  remove(
    @Param('id') id: string,
    @Body() cancelDto: CancelInterviewDto,
    @User() user: IUser,
  ) {
    return this.interviewsService.remove(id, user, cancelDto.cancelReason);
  }
}



