import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { Permission, PermissionDocument } from './schemas/permission.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { IUser } from 'src/users/users.interface';
import aqp from 'api-query-params';
import mongoose from 'mongoose';

@Injectable()
export class PermissionsService {
   
   constructor(@InjectModel(Permission.name) private permissionModel: SoftDeleteModel<PermissionDocument>) {}


  async create(createPermissionDto: CreatePermissionDto , user: IUser) {
    const {name , apiPath , method , module } = createPermissionDto;
    const isExist = await this.permissionModel.findOne({apiPath , method});
    if(isExist){
      throw new BadRequestException(`Permission với apiPath = ${apiPath} , method = ${method} dã tồn tại`);
    }
    const newPermission = await this.permissionModel.create({
      name,
      apiPath,
      method,
      module,
      createdBy:{
        _id : user._id,
        email : user.email,
      }
    });
    return {
      _id: newPermission?._id,
      createdAt : newPermission?.createdAt,
    }
  }

  async findAll(currentPage : number ,  limitPage : number , queryString: string) {
    const { filter,sort,population , projection} = aqp(queryString);
    delete filter.current;
    delete filter.pageSize;
    let offset = (+currentPage - 1) * (+limitPage);
    let defaultLimit = +limitPage ? +limitPage : 10; 

    const totalItems = (await this.permissionModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.permissionModel.find(filter)
      .skip(offset)
      .limit(defaultLimit)
      .sort(sort as any)
      .populate(population)
      .select(projection as any)
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
        {
          throw new BadRequestException(`Không tìm thấy permission`);
        }      
    return await this.permissionModel.findById(id);
  }

  async update(_id: string, updatePermissionDto: UpdatePermissionDto , user: IUser) {
     const {module , method , apiPath , name} = updatePermissionDto;
   
    if (!mongoose.Types.ObjectId.isValid(_id)) 
        {
          throw new BadRequestException(`Không tìm thấy permission`);
        } 
   
    const updatedPermission = await this.permissionModel.updateOne(
      { _id },
      {  
        module , method , apiPath , name,
        updatedBy:{
         _id: user._id,
          email: user.email,
        }
      });
      return updatedPermission;
  }

  async remove(id: string , user : IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)){ throw new BadRequestException(`Không tìm thấy permission`);}
    await this.permissionModel.updateOne(
      {_id: id},
      {
        deletedBy:{
         _id: user._id,
          email: user.email,
        }
      });
    return await this.permissionModel.softDelete({_id: id});
  }
}
