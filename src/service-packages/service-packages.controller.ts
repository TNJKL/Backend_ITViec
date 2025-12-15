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
import { ServicePackagesService } from './service-packages.service';
import { CreateServicePackageDto } from './dto/create-service-package.dto';
import { UpdateServicePackageDto } from './dto/update-service-package.dto';
import { Public, ResponseMessage, User } from 'src/decorator/customize';
import { IUser } from 'src/users/users.interface';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('service-packages')
@Controller({ path: 'service-packages', version: '1' })
export class ServicePackagesController {
  constructor(
    private readonly servicePackagesService: ServicePackagesService,
  ) {}

  @Post()
  @ResponseMessage('Tạo gói dịch vụ mới')
  create(
    @Body() createServicePackageDto: CreateServicePackageDto,
    @User() user: IUser,
  ) {
    return this.servicePackagesService.create(createServicePackageDto, user);
  }

  @Get()
  //@Public()
  @ResponseMessage('Lấy danh sách gói dịch vụ với phân trang')
  findAll(
    @Query('current') currentPage: string,
    @Query('pageSize') limitPage: string,
    @Query() queryString: string,
  ) {
    return this.servicePackagesService.findAll(
      +currentPage,
      +limitPage,
      queryString,
    );
  }

  @Get('active')
  @Public()
  @ResponseMessage('Lấy danh sách gói dịch vụ đang hoạt động')
  findAllActive() {
    return this.servicePackagesService.findAllActive();
  }

  @Get(':id')
  @Public()
  @ResponseMessage('Lấy thông tin gói dịch vụ theo id')
  findOne(@Param('id') id: string) {
    return this.servicePackagesService.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật gói dịch vụ')
  update(
    @Param('id') id: string,
    @Body() updateServicePackageDto: UpdateServicePackageDto,
    @User() user: IUser,
  ) {
    return this.servicePackagesService.update(
      id,
      updateServicePackageDto,
      user,
    );
  }

  @Delete(':id')
  @ResponseMessage('Xóa gói dịch vụ')
  remove(@Param('id') id: string, @User() user: IUser) {
    return this.servicePackagesService.remove(id, user);
  }
}



