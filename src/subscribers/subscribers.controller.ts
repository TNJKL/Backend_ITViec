import { Controller, Get, Post, Body, Patch, Param, Delete, Res, Query } from '@nestjs/common';
import { SubscribersService } from './subscribers.service';
import { CreateSubscriberDto } from './dto/create-subscriber.dto';
import { UpdateSubscriberDto } from './dto/update-subscriber.dto';
import { Public, ResponseMessage, SkipCheckPermission, User } from 'src/decorator/customize';
import { IUser } from 'src/users/users.interface';
import { ApiTags } from '@nestjs/swagger';


@ApiTags('subscribers')
@Controller('subscribers')
export class SubscribersController {
  constructor(private readonly subscribersService: SubscribersService) {}

  @Post()
  @ResponseMessage('Create a subscriber')
  create(@Body() createSubscriberDto: CreateSubscriberDto , @User() user : IUser) {
    return this.subscribersService.create(createSubscriberDto, user);
  }

  @Get()
  @ResponseMessage('Fetch subscribers with paginate')
  findAll(
    @Query("current") currentPage: string,
    @Query("pageSize") limitPage: string,
    @Query() queryString: string
  ) {
    return this.subscribersService.findAll(+currentPage, +limitPage, queryString);
  }
  


  //Post skill
  @Post("skills")
  @ResponseMessage("Get subscriber's skills")
  @SkipCheckPermission()
  getUserSkills(@User() user : IUser){
    return this.subscribersService.getSkills(user);
  }


  @Get(':id')
  @ResponseMessage('Fetch a subscriber by id')
  findOne(@Param('id') id: string) {
    return this.subscribersService.findOne(id);
  }

  // @Patch(':id')
  // @ResponseMessage('Update a subscriber')
  // update(
  //   @Param('id') id: string,
  //   @Body() updateSubscriberDto: UpdateSubscriberDto,
  //   @User() user : IUser
  //   ) {
  //   return this.subscribersService.update(id, updateSubscriberDto , user);
  // }

  @Patch()
  @SkipCheckPermission()
  @ResponseMessage('Update a subscriber')
  update( 
    @Body() updateSubscriberDto: UpdateSubscriberDto,
    @User() user : IUser
    ) {
    return this.subscribersService.update(updateSubscriberDto , user);
  }


  @Delete(':id')
  @ResponseMessage('Delete a subscriber')
  remove(@Param('id') id: string, @User() user : IUser) {
    return this.subscribersService.remove(id , user);
  }
}
