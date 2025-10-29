import { Controller, Get, Post, Body, Patch, Param, Delete, Res, Query } from '@nestjs/common';
import { ResumesService } from './resumes.service';
import { CreateResumeDto, CreateUserCvDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { ResponseMessage, User } from 'src/decorator/customize';
import { IUser } from 'src/users/users.interface';
import { ApiTags } from '@nestjs/swagger';


@ApiTags('resumes')
@Controller('resumes')
export class ResumesController {
  constructor(private readonly resumesService: ResumesService) {}

  @Post()
  @ResponseMessage("Create a resume")
  create(@Body() CreateUserCvDto: CreateUserCvDto , @User() user : IUser) {
    return this.resumesService.create(CreateUserCvDto, user);
  }
  

  @Post('by-user')
  @ResponseMessage("Fetch resumes  by user")
  getResumesByUser(@User() user : IUser) {
    return this.resumesService.findByUser(user);
  }

  @Get()
  @ResponseMessage("Fetch all resumes with paginate")
  findAll(
  @Query("current") currentPage: string, //const currentPage : string = req.query.page;
  @Query("pageSize") limitPage : string,
  @Query() queryString : string
  ) {
    return this.resumesService.findAll(+currentPage, +limitPage, queryString);
  }
 
  @Get(':id')
  @ResponseMessage("Fetch a resume by id")
  findOne(@Param('id') id: string) {
    return this.resumesService.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage("Update a resume status")
  updateStatus(@Param('id') id: string, @Body("status") status: string, @User() user : IUser) {
    return this.resumesService.update(id, status, user);
  }

  @Delete(':id')
  @ResponseMessage("Delete a resume by id")
  remove(@Param('id') id: string , @User() user : IUser) {
    return this.resumesService.remove(id, user);
  }
}
