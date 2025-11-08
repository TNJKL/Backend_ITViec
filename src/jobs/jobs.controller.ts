import { Controller, Get, Post, Body, Patch, Param, Delete, Res, Query } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { IUser } from 'src/users/users.interface';
import { Public, ResponseMessage, User } from 'src/decorator/customize';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}
  
  @ResponseMessage("Create a new job")
  @Post()
  async create(@Body() createJobDto: CreateJobDto , @User() user : IUser) {
       return this.jobsService.create(createJobDto , user);    
  }
  
  @ResponseMessage("Fetch List Job with paginate")
  @Get()
  @Public()
  findAll(@Query("current") currentPage: string,
      @Query("pageSize") limitPage: string,
      @Query() queryString: string) {
    return this.jobsService.findAll(+currentPage, +limitPage, queryString);
  }

  @Get('manage')
  @ResponseMessage("Fetch List Job with paginate (Managed)")
  findAllManaged(
    @Query("current") currentPage: string,
    @Query("pageSize") limitPage: string,
    @Query() queryString: string,
    @User() user: IUser
  ) {
    return this.jobsService.findAll(+currentPage, +limitPage, queryString, user);
  }

  @ResponseMessage("Get a job by id")
  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.jobsService.findOne(id);
  }
  

  @ResponseMessage("Update a job")
  @Patch(':id')
  update(@Param('id') id: string,
  @Body() updateJobDto: UpdateJobDto,
  @User() user: IUser) {
    return this.jobsService.update(id, updateJobDto, user);
  }
  
  @ResponseMessage("Delete a job")
  @Delete(':id')
  remove(@Param('id') id: string ,
    @User() user : IUser) {
    return this.jobsService.remove(id , user);
  }
}
