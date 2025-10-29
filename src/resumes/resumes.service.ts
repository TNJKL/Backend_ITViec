import { BadRequestException, Inject, Injectable, Res } from '@nestjs/common';
import { CreateResumeDto, CreateUserCvDto } from './dto/create-resume.dto';
import { UpdateResumeDto } from './dto/update-resume.dto';
import { IUser } from 'src/users/users.interface';
import { Resume, ResumeDocument } from './schemas/resume.schema';
import mongoose, { Model, mongo } from 'mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { InjectModel } from '@nestjs/mongoose';
import aqp from 'api-query-params';

@Injectable()
export class ResumesService {

  constructor(
    @InjectModel(Resume.name)
     private  resumeModel: SoftDeleteModel<ResumeDocument>
    ) { }

   async create(CreateUserCvDto: CreateUserCvDto , user : IUser) {
    const {url, companyId, jobId} = CreateUserCvDto;
    const {email , _id} = user;

    let newResume = await this.resumeModel.create({
      url, companyId , jobId,email,
      userId : _id,
      status : "PENDING",
      createdBy : { _id,email },
      history : [
        {
        status : "PENDING",
        updatedAt : new Date,
        updatedBy : {
          _id : user._id,
          email : user.email
        }
      }
    ],
    })
         return {
          _id : newResume?._id,
          createdAt : newResume?.createdAt,
         }
  }

  async findAll(currentPage : number ,  limitPage : number , queryString: string) {
    const { filter,sort,population , projection} = aqp(queryString);
    delete filter.current;
    delete filter.pageSize;
      let offset = (+currentPage - 1) * (+limitPage);
    let defaultLimit = +limitPage ? +limitPage : 10; 

    const totalItems = (await this.resumeModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.resumeModel.find(filter)
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
    if(!mongoose.Types.ObjectId.isValid(id)){
      throw new BadRequestException("Not found resume");
    }
    return await this.resumeModel.findById(id);
  }

  async update(id: string, status: string , user : IUser) {
    if(!mongoose.Types.ObjectId.isValid(id)){
      throw new BadRequestException("Not found resume");
  }
        const updatedResume =  await this.resumeModel.updateOne(
          {_id : id},
         {
          status : status,
          updatedBy : {
            _id: user._id,
            email : user.email
          },
          $push:{
            history : {
              status : status,
              updatedAt : new Date,
              updatedBy: {
                _id: user._id,
                email : user.email
              }
            }
          }
         });

         return updatedResume;
}

  async remove(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException("Not found resume");
    }
       await this.resumeModel.updateOne(
        {_id: id},
        {
          deletedBy: {
            _id: user._id,
            email : user.email
          }
        });
      return this.resumeModel.softDelete({
        _id: id
      });
  }


 async findByUser(user : IUser){
  return  await this.resumeModel.find({
    userId : user._id
  })
      .sort("-createdAt")
      .populate([
        {
          path: "companyId",
          select: { name: 1 }
        },
        {
          path: "jobId",
          select: { name: 1 }
        }
      ]);
}



}
