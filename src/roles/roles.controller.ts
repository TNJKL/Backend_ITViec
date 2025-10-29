import { Controller, Get, Post, Body, Patch, Param, Delete, Res, Query } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ResponseMessage, User } from 'src/decorator/customize';
import { IUser } from 'src/users/users.interface';
import { ApiTags } from '@nestjs/swagger';


@ApiTags('roles')
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @ResponseMessage("Create a new role")
  create(@Body() createRoleDto: CreateRoleDto , @User() user : IUser) {
    return this.rolesService.create(createRoleDto, user);
  }

  @Get()
  @ResponseMessage("Fetch List jobs with paginate")
      findAll(
      @Query("current") currentPage: string,
      @Query("pageSize") limitPage: string,
      @Query() queryString: string) {
    return this.rolesService.findAll(+currentPage, +limitPage, queryString);
  }

  @Get(':id')
  @ResponseMessage("Get a role by id")
  findOne(@Param('id') id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage("Update a role")
  update(@Param('id') id: string,
  @Body() updateRoleDto: UpdateRoleDto,
   @User() user : IUser) {
    return this.rolesService.update(id, updateRoleDto, user);
  }

  @Delete(':id')
  @ResponseMessage("Delete a role")
  remove(@Param('id') id: string , @User() user : IUser) {
    return this.rolesService.remove(id, user);
  }
}
