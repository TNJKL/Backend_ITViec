import { BadRequestException, Injectable, OnModuleInit } from '@nestjs/common';
import { CreateJobDto } from './dto/create-job.dto';
import { UpdateJobDto } from './dto/update-job.dto';
import { Job, JobDocument } from './schemas/job.schema';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { IUser } from 'src/users/users.interface';
import { User as UserEntity, UserDocument } from 'src/users/schemas/user.schema';
import { UserPackagesService } from 'src/user-packages/user-packages.service';
import mongoose from 'mongoose';
import aqp from 'api-query-params';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class JobsService implements OnModuleInit {

   constructor(
     @InjectModel(Job.name) private jobModel: SoftDeleteModel<JobDocument>,
     @InjectModel(UserEntity.name) private userModel: SoftDeleteModel<UserDocument>,
     private userPackagesService: UserPackagesService
   ) {}

  async create(createJobDto: CreateJobDto , user : IUser) {
    const {
      name,
      skills,
      company,
      salary,
      level,
      description,
      startDate,
      endDate,
      isActive,
      location,
      workingModel,
      tag,
      userPackageId,
    } = createJobDto;
    
    // Kiểm tra quyền đăng job dựa trên gói dịch vụ
    const roleName = (user as any)?.role?.name;
    let activePackageId: string | null = null;
    let activePackage: any = null;
    if (roleName === 'HR' || roleName === 'EMPLOYER') {
      const canPost = await this.userPackagesService.canPostJob(user._id as string, {
        desiredTag: tag,
        userPackageId,
        requireRemainingJobs: true,
      });
      if (!canPost.canPost) {
        throw new BadRequestException(canPost.message || 'Bạn không có quyền đăng job này');
      }
      activePackage = canPost.package;
      activePackageId =
        canPost.userPackageId ||
        canPost.package?._id?.toString?.() ||
        null;
    }

    let newJob = await this.jobModel.create({
      name,
      skills,
      company,
      salary,
      level,
      description,
      startDate,
      endDate,  
      isActive,
      status: 'published', // Mặc định status là published khi tạo mới
      location,
      workingModel,
      tag: tag || null,
      userPackageId: activePackageId ? new mongoose.Types.ObjectId(activePackageId) : undefined,
      createdBy:{
        _id: user._id,
        email: user.email,
      }    
    });

    // Tăng số lượng job đã sử dụng
    if (roleName === 'HR' || roleName === 'EMPLOYER') {
      await this.userPackagesService.incrementJobUsage(
        user._id as string,
        activePackageId || undefined,
      );
    }

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

    // Đối với ứng viên (public user): chỉ lấy job có status='published' (hoặc không có status) và endDate > hiện tại
    if (!user) {
      const now = new Date();
      // Xử lý cả job cũ không có trường status (coi như published) và job mới có status='published'
      // @ts-ignore
      filter.$or = [
        { status: 'published' },
        { status: { $exists: false } },
        { status: null },
      ];
      // @ts-ignore
      filter.endDate = { $gt: now };
      // @ts-ignore
      filter.isActive = true;
    } else {
      // Mặc định chỉ lấy job đang active nếu client không truyền isActive
      // - HR/EMPLOYER: áp dụng
      // - ADMIN/khác: không áp dụng (để thấy cả inactive)
      if (typeof (filter as any).isActive === 'undefined') {
        const roleName = (user as any)?.role?.name;
        // HR/EMPLOYER mặc định chỉ thấy job active
        if (roleName === 'HR' || roleName === 'EMPLOYER') {
          // @ts-ignore
          filter.isActive = true;
        }
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

  async update(id: string, updateJobDto: UpdateJobDto, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Job không hợp lệ');
    }

    const existingJob = await this.jobModel.findById(id);
    if (!existingJob) {
      throw new BadRequestException('Không tìm thấy job cần cập nhật');
    }

    const roleName = (user as any)?.role?.name;
    const { userPackageId: incomingUserPackageId, ...restDto } = updateJobDto as any;
    let resolvedUserPackageId = existingJob.userPackageId?.toString();
    let shouldUpdateUserPackage = false;

    const desiredTag =
      typeof restDto.tag !== 'undefined' && restDto.tag !== null && restDto.tag !== ''
        ? restDto.tag
        : undefined;
    const tagChanged =
      typeof restDto.tag !== 'undefined' &&
      (restDto.tag || null) !== (existingJob.tag || null);

    if (roleName === 'HR' || roleName === 'EMPLOYER') {
      const packagePreference = incomingUserPackageId || resolvedUserPackageId;
      const hasPackageChange = Boolean(
        incomingUserPackageId && incomingUserPackageId !== resolvedUserPackageId,
      );
      const validationTag = desiredTag ?? existingJob.tag ?? undefined;
      const needsValidation = Boolean(
        (tagChanged && validationTag) || (hasPackageChange && validationTag),
      );

      if (needsValidation && validationTag) {
        const requiresAdditionalSlot =
          tagChanged && this.getTagPriority(desiredTag) > this.getTagPriority(existingJob.tag);

        let validation = await this.userPackagesService.canPostJob(user._id as string, {
          desiredTag: validationTag,
          userPackageId: packagePreference,
          requireRemainingJobs: requiresAdditionalSlot,
        });

        if (!validation.canPost && packagePreference) {
          validation = await this.userPackagesService.canPostJob(user._id as string, {
            desiredTag: validationTag,
            requireRemainingJobs: requiresAdditionalSlot,
          });
        }

        if (!validation.canPost) {
          throw new BadRequestException(validation.message || 'Không thể cập nhật tag/gói cho job này.');
        }

        resolvedUserPackageId = validation.userPackageId || resolvedUserPackageId;
        shouldUpdateUserPackage = Boolean(validation.userPackageId);
      }
    }

    const updatePayload: any = {
      ...restDto,
      updatedBy: {
        _id: user._id,
        email: user.email,
      },
    };

    if (shouldUpdateUserPackage && resolvedUserPackageId) {
      updatePayload.userPackageId = new mongoose.Types.ObjectId(resolvedUserPackageId);
    }

    return this.jobModel.updateOne({ _id: id }, updatePayload);
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
  private getTagPriority(tag?: string | null) {
    switch (tag) {
      case 'Super Hot':
        return 3;
      case 'Hot':
        return 2;
      case 'New':
        return 1;
      default:
        return 0;
    }
  }

  /**
   * Cron job chạy mỗi giờ để tự động cập nhật status của job hết hạn thành 'expired'
   * Kiểm tra các job có endDate <= hiện tại và (status = 'published' hoặc không có status)
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleExpiredJobs() {
    try {
      const now = new Date();
      
      // Cập nhật job hết hạn có status = 'published' hoặc không có status
      const result = await this.jobModel.updateMany(
        {
          endDate: { $lte: now },
          $or: [
            { status: 'published' },
            { status: { $exists: false } },
            { status: null },
          ],
          isDeleted: false,
        },
        {
          $set: {
            status: 'expired',
            updatedAt: now,
          },
        },
      );

      if (result.modifiedCount > 0) {
        console.log(
          `[Cron Job] Đã cập nhật ${result.modifiedCount} job hết hạn thành status 'expired'`,
        );
      }
    } catch (error) {
      console.error('[Cron Job] Lỗi khi cập nhật job hết hạn:', error);
    }
  }

  /**
   * Migration: Set status = 'published' cho các job cũ không có trường status
   * Chạy ngay khi service được khởi tạo (onModuleInit)
   */
  async onModuleInit() {
    await this.migrateOldJobsStatus();
    await this.updateExpiredEndDates();
  }

  /**
   * Migration: Set status = 'published' cho các job cũ không có trường status
   * Và cập nhật endDate thành tương lai (30 ngày từ hiện tại) nếu endDate đã hết hạn
   * Có thể gọi thủ công hoặc tự động chạy khi server khởi động
   */
  async migrateOldJobsStatus() {
    try {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // Thêm 30 ngày từ hiện tại

      // Tìm các job cũ cần migrate
      const jobsToMigrate = await this.jobModel.find({
        $or: [
          { status: { $exists: false } },
          { status: null },
        ],
        isDeleted: false,
      });

      let updatedCount = 0;
      let dateUpdatedCount = 0;

      for (const job of jobsToMigrate) {
        const updateData: any = {
          status: 'published',
        };

        // Nếu endDate đã hết hạn (trong quá khứ), cập nhật thành tương lai để test
        if (job.endDate && new Date(job.endDate) <= now) {
          updateData.endDate = futureDate;
          dateUpdatedCount++;
        }

        await this.jobModel.updateOne(
          { _id: job._id },
          { $set: updateData },
        );
        updatedCount++;
      }

      if (updatedCount > 0) {
        console.log(
          `[Migration] Đã cập nhật ${updatedCount} job cũ với status = 'published'`,
        );
        if (dateUpdatedCount > 0) {
          console.log(
            `[Migration] Đã cập nhật ${dateUpdatedCount} job có endDate hết hạn thành ${futureDate.toISOString().split('T')[0]} (30 ngày từ hiện tại)`,
          );
        }
      } else {
        console.log('[Migration] Không có job cũ cần migrate');
      }
    } catch (error) {
      console.error('[Migration] Lỗi khi migrate status cho job cũ:', error);
    }
  }

  /**
   * Migration: Cập nhật endDate thành tương lai cho các job đã có status='published' 
   * nhưng endDate vẫn trong quá khứ (để test)
   */
  async updateExpiredEndDates() {
    try {
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // Thêm 30 ngày từ hiện tại

      // Tìm các job đã có status='published' nhưng endDate đã hết hạn
      const result = await this.jobModel.updateMany(
        {
          status: 'published',
          endDate: { $lte: now },
          isDeleted: false,
        },
        {
          $set: {
            endDate: futureDate,
            updatedAt: new Date(),
          },
        },
      );

      if (result.modifiedCount > 0) {
        console.log(
          `[Migration] Đã cập nhật ${result.modifiedCount} job có endDate hết hạn thành ${futureDate.toISOString().split('T')[0]} (30 ngày từ hiện tại)`,
        );
      } else {
        console.log('[Migration] Không có job nào cần cập nhật endDate');
      }
    } catch (error) {
      console.error('[Migration] Lỗi khi cập nhật endDate cho job:', error);
    }
  }
}
