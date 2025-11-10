import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateUserCvDto } from './dto/create-resume.dto';
import { UpdateResumeFileDto } from './dto/update-resume-file.dto';
import { IUser } from 'src/users/users.interface';
import { Resume, ResumeDocument } from './schemas/resume.schema';
import mongoose from 'mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { InjectModel } from '@nestjs/mongoose';
import aqp from 'api-query-params';
import { User as UserEntity, UserDocument } from 'src/users/schemas/user.schema';

@Injectable()
export class ResumesService {

  constructor(
    @InjectModel(Resume.name)
     private  resumeModel: SoftDeleteModel<ResumeDocument>,
    @InjectModel(UserEntity.name)
     private  userModel: SoftDeleteModel<UserDocument>
    ) { }

  private notDeletedCondition() {
    return {
      $or: [
        { isDeleted: { $exists: false } },
        { isDeleted: false },
        { isDeleted: null },
      ],
    };
  }

  private withActiveFilter(additional?: Record<string, any>) {
    if (!additional || Object.keys(additional).length === 0) {
      return this.notDeletedCondition();
    }
    return { $and: [this.notDeletedCondition(), additional] };
  }

   async create(CreateUserCvDto: CreateUserCvDto , user : IUser) {
    const {url, companyId, jobId} = CreateUserCvDto;
    const {email , _id} = user;

    const existing = await this.resumeModel.findOne(this.withActiveFilter({
      userId: _id,
      jobId: new mongoose.Types.ObjectId(jobId as any),
    }));

    if (existing) {
      throw new BadRequestException({
        message: `Bạn đã ứng tuyển công việc này ngày ${existing.createdAt?.toLocaleDateString('vi-VN')}. Vui lòng chờ phản hồi hoặc cập nhật CV`,
        code: 'ALREADY_APPLIED',
        data: {
          resumeId: existing._id,
          appliedAt: existing.createdAt,
          status: existing.status,
        },
      });
    }

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

  async findAll(currentPage : number ,  limitPage : number , queryString: string, user?: IUser) {
    const { filter,sort,population , projection} = aqp(queryString);
    delete filter.current;
    delete filter.pageSize;
      let offset = (+currentPage - 1) * (+limitPage);
    let defaultLimit = +limitPage ? +limitPage : 10; 

    // HR/EMPLOYER chỉ xem resume ứng tuyển vào công ty mình
    const roleName = (user as any)?.role?.name;
    if (user && (roleName === 'EMPLOYER' || roleName === 'HR')) {
      let companyId = (user as any)?.company?._id;
      if (!companyId && user?._id) {
        const u = await this.userModel.findById(user._id).select('company');
        // @ts-ignore
        companyId = (u as any)?.company?._id;
      }
      filter.companyId = companyId ?? '__none__';
    }

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

 async updateFile(id: string, payload: UpdateResumeFileDto, user: IUser) {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new BadRequestException("Not found resume");
  }

  const resume = await this.resumeModel.findOne(this.withActiveFilter({
    _id: new mongoose.Types.ObjectId(id),
    userId: user._id,
  }));

  if (!resume) {
    throw new BadRequestException("Không tìm thấy hồ sơ ứng tuyển để cập nhật");
  }

  resume.url = payload.url;
  resume.updatedBy = {
    _id: new mongoose.Types.ObjectId(user._id as any),
    email: user.email,
  } as any;
  const newHistoryEntry = {
    status: resume.status,
    updatedAt: new Date(),
    updatedBy: {
      _id: new mongoose.Types.ObjectId(user._id as any),
      email: user.email,
    },
  };
  resume.history = [
    ...(resume.history ?? []),
    newHistoryEntry as any,
  ];

  await resume.save();

  return {
    _id: resume._id,
    url: resume.url,
    updatedAt: resume.updatedAt,
    status: resume.status,
  };
 }

 async checkApplied(jobId: string, user: IUser) {
  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    throw new BadRequestException("JobId không hợp lệ");
  }

  const resume = await this.resumeModel.findOne(this.withActiveFilter({
    userId: user._id,
    jobId: new mongoose.Types.ObjectId(jobId),
  }));

  if (!resume) {
    return {
      applied: false,
    };
  }

  return {
    applied: true,
    resumeId: resume._id,
    appliedAt: resume.createdAt,
    status: resume.status,
    url: resume.url,
  };
 }


}
