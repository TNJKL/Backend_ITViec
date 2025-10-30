import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserDto, RegisterUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User as UserM, UserDocument} from './schemas/user.schema';
import { InjectModel } from '@nestjs/mongoose';
import mongoose, { Model } from 'mongoose';
import {genSaltSync , hashSync , compareSync} from "bcryptjs";
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { IUser } from './users.interface';
import { User} from 'src/decorator/customize';
import aqp from 'api-query-params';
import { USER_ROLE } from 'src/databases/sample';
import { Role , RoleDocument } from 'src/roles/schemas/role.schema';


@Injectable()
export class UsersService {

  constructor(@InjectModel(UserM.name) private userModel: SoftDeleteModel<UserDocument>,
              @InjectModel(Role.name) private roleModel: SoftDeleteModel<RoleDocument>
            ) {}
   
  getHashPassword = (plainPassword: string) => {
    const salt = genSaltSync(10);
    const hash = hashSync(plainPassword, salt);
    return hash;
  }

   async create(createUserDto: CreateUserDto ,  @User() user : IUser) {
    const {name , email , password,age, gender, address, role , company} = createUserDto;
    const hashedPassword = this.getHashPassword(password);   
    const isExist = await this.userModel.findOne({email});
    if(isExist){
      throw new BadRequestException(`Email:  ${email} đã tồn tại , vui lòng chọn email khác`);
    }
    let newUser = await this.userModel.create({
      name,
      email,
      password: hashedPassword,
      age,
      gender,
      address,
      role,
      company,
      createdBy:{
        _id: user._id,
        email: user.email,
      } 
  });
    return newUser;
  } 

async register(user: RegisterUserDto){
     const {name , email , password, age, gender, address} = user;
     const hashedPassword = this.getHashPassword(password);
     const isExist = await this.userModel.findOne({email});
    if(isExist){
      throw new BadRequestException(`Email:  ${email} đã tồn tại , vui lòng chọn email khác`);
    } 
    

    //fetch user role
    const userRole = await this.roleModel.findOne({name : USER_ROLE});

    let newRegister = await this.userModel.create({
      name,
      email, 
      password: hashedPassword,
      age,
      gender,
      address,
      role: userRole?._id,
    });
    
    return newRegister;
    }


  async findAll(currentPage : number ,  limitPage : number , queryString: string) {
    const { filter,sort,population } = aqp(queryString);
    delete filter.current;
    delete filter.pageSize;
      let offset = (+currentPage - 1) * (+limitPage);
    let defaultLimit = +limitPage ? +limitPage : 10; 

    const totalItems = (await this.userModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);

   

    const result = await this.userModel.find(filter)
      .skip(offset)
      .limit(defaultLimit)
      // @ts-ignore: Unreachable code error
      .sort(sort)
      .select("-password")
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


  //tim 1 user
  async findOne(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) 
      return `Không tìm thấy user`;
      return await this.userModel.findOne({
        _id: id
      })
      .select("-password")
      .populate({path: "role", select: {name: 1 , _id : 1}});
      //exclude >< include
}



 findOneByUsername(username: string) {
      return this.userModel.findOne({
        email: username
      }).populate({path: "role", select: {name: 1}});
    
  }

  isValidPassword(password : string , hash : string){
   return compareSync(password, hash );

  }
  async update(updateUserDto: UpdateUserDto , user: IUser , _id: string) {
    if (!mongoose.Types.ObjectId.isValid(_id)) 
      throw new BadRequestException(`Không tìm thấy user`);
      const updated =  await this.userModel.updateOne(
        {_id: _id},
         {...updateUserDto,
           updatedBy: {
            _id: user._id,
            email: user.email
          }
        });
      return updated;
  }

  async remove(id: string , user: IUser) {
    if(!mongoose.Types.ObjectId.isValid(id)){
      return `Không tìm thấy user`;
    }

  const foundUser =  await this.userModel.findById(id);
  if(foundUser && foundUser.email === "admin@gmail.com"){
    throw new BadRequestException("Không thể xóa tài khoản của Admin");
  }

    await this.userModel.updateOne(
      {_id: id} ,
      {
        deletedBy: {
            _id: user._id,
            email: user.email
           }
         });

    return this.userModel.softDelete({
      _id: id
    });
  }
  
   updateUserToken = async (refreshToken : string , _id : string) => {
    return await this.userModel.updateOne({_id} , {refreshToken});
  }

   findUserByToken = async (refreshToken : string) => {
    return await this.userModel.findOne({refreshToken})
    .populate({path: "role", select: {name: 1}
    });
   }

}
