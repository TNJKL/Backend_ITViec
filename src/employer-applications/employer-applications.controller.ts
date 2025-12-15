import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { EmployerApplicationsService } from './employer-applications.service';
import { CreateEmployerApplicationDto } from './dto/create-employer-application.dto';
import { Public, ResponseMessage } from 'src/decorator/customize';

@Controller('employer-applications')
export class EmployerApplicationsController {
  constructor(private readonly service: EmployerApplicationsService) {}

  @Public()
  @ResponseMessage('Tạo đăng ký nhà tuyển dụng')
  @Post()
  create(@Body() dto: CreateEmployerApplicationDto) {
    return this.service.create(dto);
  }

  @ResponseMessage('Danh sách đăng ký nhà tuyển dụng')
  @Get()
  findAll(@Query() query: any) {
    return this.service.findAll(query);
  }

  @ResponseMessage('Duyệt đăng ký nhà tuyển dụng')
  @Post(':id/approve')
  approve(@Param('id') id: string) {
    return this.service.approve(id);
  }

  @ResponseMessage('Từ chối đăng ký nhà tuyển dụng')
  @Post(':id/reject')
  reject(@Param('id') id: string, @Body('note') note?: string) {
    return this.service.reject(id, note);
  }
}

