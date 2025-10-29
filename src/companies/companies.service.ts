import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateCompanyDto } from './dto/create-company.dto';
import { UpdateCompanyDto } from './dto/update-company.dto';
import { Company, CompanyDocument } from './schemas/company.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { IUser } from 'src/users/users.interface';
import aqp from 'api-query-params';
import mongoose from 'mongoose';
@Injectable()
export class CompaniesService {
   
  constructor(@InjectModel(Company.name) private companyModel: SoftDeleteModel<CompanyDocument>) {}

  async create(createCompanyDto: CreateCompanyDto , user : IUser) {
           let company = await this.companyModel.create({
            name: createCompanyDto.name,
            address : createCompanyDto.address,
            description : createCompanyDto.description,
            logo : createCompanyDto.logo,
            createdBy : {
              _id : user._id,
              email : user.email
            }
           });
    return company;
  }

  async findAll(currentPage : number ,  limitPage : number , queryString: string) {
    const { filter,sort,population } = aqp(queryString);
    delete filter.current;
    delete filter.pageSize;
      let offset = (+currentPage - 1) * (+limitPage);
    let defaultLimit = +limitPage ? +limitPage : 10; 

    const totalItems = (await this.companyModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);

   

    const result = await this.companyModel.find(filter)
      .skip(offset)
      .limit(defaultLimit)
      // @ts-ignore: Unreachable code error
      .sort(sort)
      .populate(population)
      .exec();
    

      return {
      meta: { 
        current: currentPage, //trang hiện tại
        pageSize: limitPage, //số lượng bản ghi đã lấy
        pages: totalPages,  //tổng số trang với điều kiện query
        total: totalItems // tổng số phần tử (số bản ghi)
      },
      result //kết quả query
    }

     
  }

  async findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) 
       throw new BadRequestException(`Công ty với id ${id} không hợp lệ`);
        return await this.companyModel.findById(id);
  }

  async update(id : string, updateCompanyDto: UpdateCompanyDto , user : IUser) {
    return await this.companyModel.updateOne(
      { _id: id},
        {
        ...updateCompanyDto,
         updatedBy:{
          _id: user._id,
           email: user.email
        }
        }
      )
  }

  async remove(id: string , user: IUser) {
    await this.companyModel.updateOne( 
      { _id: id},
      {
        deletedBy:{
          _id: user._id,
          email: user.email
        }
      });
    return this.companyModel.softDelete({
      _id: id
    });
  }
}
