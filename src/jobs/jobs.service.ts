import { Injectable } from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { Job, JobDocument } from './schemas/job.schema';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { IUser } from 'src/users/users.interface';
import { User as UserEntity, UserDocument } from 'src/users/schemas/user.schema';
import mongoose from 'mongoose';
import aqp from 'api-query-params';

@Injectable()
export class JobsService {

   constructor(
     @InjectModel(Job.name) private jobModel: SoftDeleteModel<JobDocument>,
     @InjectModel(UserEntity.name) private userModel: SoftDeleteModel<UserDocument>
   ) {}

  async create(createJobDto: CreateJobDto , user : IUser) {
    const { name, skills, company, salary, quantity, level, description, startDate, endDate ,isActive , location , workingModel } = createJobDto;
    let newJob = await this.jobModel.create({
      name,
      skills,
      company,
      salary,
      quantity,
      level,
      description,
      startDate,
      endDate,  
      isActive,
      location,
      workingModel,
      createdBy:{
        _id: user._id,
        email: user.email,
      }    
    });
    return { 
      _id: newJob?._id,
      createdAt: newJob?.createdAt,
    };
  }

  async findAll(currentPage : number ,  limitPage : number , queryString: string, user?: IUser) {
    const { filter,sort,population } = aqp(queryString);
    delete filter.current;
    delete filter.pageSize;
      let offset = (+currentPage - 1) * (+limitPage);
    let defaultLimit = +limitPage ? +limitPage : 10; 

    // Mặc định chỉ lấy job đang active nếu client không truyền isActive
    // - Public (user undefined): áp dụng
    // - HR/EMPLOYER: áp dụng
    // - ADMIN/khác: không áp dụng (để thấy cả inactive)
    if (typeof (filter as any).isActive === 'undefined') {
      const shouldForceActive = !user; // chỉ public mới ép isActive=true
      if (shouldForceActive) {
        // @ts-ignore
        filter.isActive = true;
      }
    }

    // HR/EMPLOYER chỉ xem job thuộc công ty mình
    const roleName = (user as any)?.role?.name;
    if (user && (roleName === 'EMPLOYER' || roleName === 'HR')) {
      let companyId = (user as any)?.company?._id;
      if (!companyId && user?._id) {
        const u = await this.userModel.findById(user._id).select('company');
        // @ts-ignore
        companyId = (u as any)?.company?._id;
      }
      if (companyId) {
        // job.company là object; DB có thể lưu _id dạng ObjectId hoặc string => dùng $in cả 2
        const candidates: any[] = [companyId];
        try {
          const id = new (require('mongoose').Types.ObjectId)(companyId);
          candidates.push(id);
        } catch {}
        // @ts-ignore
        filter['company._id'] = { $in: candidates } as any;
      } else {
        // @ts-ignore
        filter['company._id'] = '__none__';
      }
    }

    const totalItems = (await this.jobModel.find(filter)).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);

   

    const result = await this.jobModel.find(filter)
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
          return `Không tìm thấy job`;
    return await this.jobModel.findById(id);
  }

  update(id: string, updateJobDto: UpdateJobDto, user: IUser) {
    return this.jobModel.updateOne(
      {_id: id},
      {
        ...updateJobDto,
        updatedBy: {
          _id: user._id,
          email: user.email
        }
      }
    )
  }

 async remove(id: string , user : IUser) {
  if (!mongoose.Types.ObjectId.isValid(id)) 
          return `Không tìm thấy job`;
      await this.jobModel.updateOne(
        {_id: id},
        {
          deletedBy: {
            _id: user._id,
            email: user.email
        }
      }
      )
      return await this.jobModel.softDelete({_id: id});
  }
}
