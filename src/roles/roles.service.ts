import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { IUser } from 'src/users/users.interface';
import { Role, RoleDocument } from './schemas/role.schema';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import aqp from 'api-query-params';
import mongoose from 'mongoose';
import { ADMIN_ROLE } from 'src/databases/sample';

@Injectable()
export class RolesService {
   constructor(@InjectModel(Role.name) private roleModel: SoftDeleteModel<RoleDocument>) {}
   
  async create(createRoleDto: CreateRoleDto , user : IUser ) {
    const { name , description , isActive, permissions } = createRoleDto;
    const isExist = await this.roleModel.findOne({name});
    if(isExist){
      throw new BadRequestException(`Role với name = ${name} dã tồn tại`);
    }
    const newRole = await this.roleModel.create({
      name , description , isActive, permissions,
      createdBy:{
        _id: user._id,
        email: user.email,
      }
    });

    return {
      _id: newRole?._id,
      createdAt : newRole?.createdAt,
    }
   
  }

  async findAll(currentPage : number ,  limitPage : number , queryString: string) {
    const { filter,sort,population , projection} = aqp(queryString);
    delete filter.current;
    delete filter.pageSize;
    let offset = (+currentPage - 1) * (+limitPage);
    let defaultLimit = +limitPage ? +limitPage : 10; 

    const totalItems = (await this.roleModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.roleModel.find(filter)
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
              throw new BadRequestException(`Không tìm thấy role`);
            }      
    return (await this.roleModel.findById(id)).populate({
      path: "permissions" , select: { _id: 1 , apiPath: 1  , name :1 , method :1 , module:1} 
    });
  }

  async  update(_id: string, updateRoleDto: UpdateRoleDto, user: IUser) {
    const { name , description , isActive, permissions } = updateRoleDto;
    // const isExist = await this.roleModel.findOne({name});
    // if(isExist){
    //   throw new BadRequestException(`Role với name = ${name} đã tồn tại`);
    // }
    const updated =  await this.roleModel.updateOne(
      { _id },
      {
        name , description , isActive, permissions,
        updatedBy:{
          _id: user._id,
          email: user.email,
        }
      });

      return updated;
  }

  async remove(id: string , user : IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {throw new BadRequestException(`Không tìm thấy role`);}

    const foundRole = await this.roleModel.findById(id);


    if(foundRole.name === ADMIN_ROLE){
      throw new BadRequestException("Không thể xóa vai trò Admin");
    }
       await this.roleModel.updateOne(
        {_id: id},
        {deletedBy:{
          _id: user._id,
          email : user.email,
      }
    })

    return await this.roleModel.softDelete({_id: id});
}
}
