import { Controller, Get, Post, Body, Patch, Param, Delete, Res, Query } from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateSelfDto } from './dto/update-self.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Public, ResponseMessage, User } from 'src/decorator/customize';
import { IUser } from './users.interface';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}
  
  

  @Post()
  @ResponseMessage("Create a new user")
  async create(@Body() createUserDto: CreateUserDto , @User() user : IUser) {
    let newUser =  await this.usersService.create(createUserDto , user);
    return {
      _id : newUser?._id,
      createdAt: newUser?.createdAt,
    }
  }
  
  
  // @Post()
  // @ResponseMessage("Create a new user")
  // create(@Body() createUserDto: CreateUserDto , @User() user : IUser) {
  //   return this.usersService.create(createUserDto , user);
  // }
  

  
  @Get()
  @ResponseMessage("Fetch user with paginate")
  findAll(
    @Query('current') currentPage: string,
    @Query('pageSize') limit: string,
    @Query() qs: string,){
    return this.usersService.findAll(+currentPage, +limit, qs);
  }

  
  @Public()
  @ResponseMessage("Get a user by id")
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const foundUser = await  this.usersService.findOne(id);
    return foundUser;
  }

  // @Patch()
  // @ResponseMessage("Update a user")
  // update(@Body() updateUserDto: UpdateUserDto, @User() user: IUser) {
  //   return this.usersService.update(updateUserDto, user);
  // }

  // @Patch()
  //  @ResponseMessage("Update a user")
  //  async update(@Body() updateUserDto: UpdateUserDto, @User() user: IUser) {
  //    let updatedUser =  await this.usersService.update(updateUserDto, user);
  //    return updatedUser;
  //  }


  
  @ResponseMessage("Update self user")
  @Patch('me')
  async updateSelf(@Body() updateSelfDto: UpdateSelfDto, @User() user: IUser) {
    const updatedUser = await this.usersService.updateSelf(updateSelfDto as any, user, user._id);
    return updatedUser;
  }

  @ResponseMessage("Change self password")
  @Patch('me/password')
  async changePasswordSelf(@Body() dto: ChangePasswordDto, @User() user: IUser) {
    return this.usersService.changePasswordSelf(user._id, dto, user);
  }

  @ResponseMessage("Update a user")
  @Patch(':id')
  async update(@Body() updateUserDto: UpdateUserDto,
   @User() user: IUser,
   @Param('id') id: string) {
    let updatedUser =  await this.usersService.update(updateUserDto, user , id);
    return updatedUser;
  }
  
  
  @ResponseMessage("Delete a user")
  @Delete(':id')
  remove(@Param('id') id: string ,@User() user: IUser) {
    return this.usersService.remove(id, user);
  }
}
