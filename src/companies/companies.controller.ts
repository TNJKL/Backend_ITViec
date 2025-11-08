import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Public, ResponseMessage, User } from 'src/decorator/customize';
import { IUser } from 'src/users/users.interface';
import { ApiTags } from '@nestjs/swagger';


@ApiTags('companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}
  
  //them decorator Public de bo qua JWT
  @Post()
  @ResponseMessage("Create a company")
  create(@Body() createCompanyDto: CreateCompanyDto , @User() user : IUser) {
    
    return this.companiesService.create(createCompanyDto , user);
  }
  


  @Get()
  @Public()
  @ResponseMessage("Fetch List Company with paginate")
  findAll(
    @Query("current") currentPage: string, //const currentPage : string = req.query.page;
    @Query("pageSize") limitPage : string,
    @Query() queryString : string
  ) {
    return this.companiesService.findAll(+currentPage , + limitPage , queryString);
  }

  @Get('manage')
  @ResponseMessage("Fetch List Company with paginate (Managed)")
  findAllManaged(
    @Query("current") currentPage: string,
    @Query("pageSize") limitPage : string,
    @Query() queryString : string,
    @User() user : IUser
  ) {
    return this.companiesService.findAll(+currentPage , + limitPage , queryString, user);
  }
  
  @ResponseMessage("Get a company by id")
  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
    @User() user : IUser) {
    return this.companiesService.update(id,updateCompanyDto , user);
  }
  

  
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @User() user : IUser
) {
    return this.companiesService.remove(id, user);
  }
}
