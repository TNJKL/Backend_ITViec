import {
  BadRequestException,
  Injectable,
  ForbiddenException,
} from '@nestjs/common';
import { CreateInterviewDto } from './dto/create-interview.dto';
import {
  UpdateInterviewDto,
  UpdateInterviewResultDto,
} from './dto/update-interview.dto';
import { Interview, InterviewDocument } from './schemas/interview.schema';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { IUser } from 'src/users/users.interface';
import { Resume, ResumeDocument } from 'src/resumes/schemas/resume.schema';
import { Job, JobDocument } from 'src/jobs/schemas/job.schema';
import { User as UserEntity, UserDocument } from 'src/users/schemas/user.schema';
import mongoose from 'mongoose';
import aqp from 'api-query-params';
import { NotificationsService } from 'src/notifications/notifications.service';
import { MailerService } from '@nestjs-modules/mailer';
import { RESUME_STATUS } from 'src/common/constants/resume-status.constant';

@Injectable()
export class InterviewsService {
  constructor(
    @InjectModel(Interview.name)
    private interviewModel: SoftDeleteModel<InterviewDocument>,
    @InjectModel(Resume.name)
    private resumeModel: SoftDeleteModel<ResumeDocument>,
    @InjectModel(Job.name)
    private jobModel: SoftDeleteModel<JobDocument>,
    @InjectModel(UserEntity.name)
    private userModel: SoftDeleteModel<UserDocument>,
    private notificationsService: NotificationsService,
    private mailerService: MailerService,
  ) {}

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

  /**
   * Tạo lịch phỏng vấn mới
   * Tự động cập nhật Resume status thành 'INTERVIEW_SCHEDULED'
   */
  async create(createInterviewDto: CreateInterviewDto, user: IUser) {
    const { resumeId, jobId, scheduledDate, location, interviewType, meetingLink, notes } =
      createInterviewDto;

    const scheduledDateObj = new Date(scheduledDate);
    if (Number.isNaN(scheduledDateObj.getTime())) {
      throw new BadRequestException('Ngày giờ phỏng vấn không hợp lệ');
    }

    // Kiểm tra quyền: chỉ HR/EMPLOYER mới được tạo lịch phỏng vấn
    const roleName = (user as any)?.role?.name;
    if (roleName !== 'HR' && roleName !== 'EMPLOYER' && roleName !== 'ADMIN') {
      throw new ForbiddenException('Bạn không có quyền tạo lịch phỏng vấn');
    }

    // Kiểm tra Resume tồn tại
    const resume = await this.resumeModel.findOne(
      this.withActiveFilter({
        _id: new mongoose.Types.ObjectId(resumeId as any),
      }),
    );

    if (!resume) {
      throw new BadRequestException('Không tìm thấy hồ sơ ứng tuyển');
    }

    // Kiểm tra Resume status phải là APPROVED hoặc REVIEWING
    if (resume.status !== 'APPROVED' && resume.status !== 'REVIEWING') {
      throw new BadRequestException(
        `Không thể tạo lịch phỏng vấn cho hồ sơ có status: ${resume.status}. Status phải là APPROVED hoặc REVIEWING`,
      );
    }

    // Kiểm tra Job tồn tại
    const job = await this.jobModel.findOne(
      this.withActiveFilter({
        _id: new mongoose.Types.ObjectId(jobId as any),
      }),
    );

    if (!job) {
      throw new BadRequestException('Không tìm thấy công việc');
    }

    // Kiểm tra Resume thuộc Job này
    const resumeJobId = resume.jobId instanceof mongoose.Types.ObjectId 
      ? resume.jobId.toString() 
      : (resume.jobId as any)?.toString?.() || String(resume.jobId);
    const compareJobId = jobId instanceof mongoose.Types.ObjectId 
      ? jobId.toString() 
      : String(jobId);
    
    if (resumeJobId !== compareJobId) {
      throw new BadRequestException('Hồ sơ không thuộc công việc này');
    }

    // Kiểm tra HR có quyền với công ty này không
    let companyId = (user as any)?.company?._id;
    if (!companyId && user?._id) {
      const u = await this.userModel.findById(user._id).select('company');
      companyId = (u as any)?.company?._id;
    }

    if (companyId && resume.companyId.toString() !== companyId.toString()) {
      throw new ForbiddenException('Bạn không có quyền tạo lịch phỏng vấn cho hồ sơ này');
    }

    // Kiểm tra đã có lịch phỏng vấn chưa hoàn thành cho Resume này chưa
    const existingInterview = await this.interviewModel.findOne(
      this.withActiveFilter({
        resumeId: new mongoose.Types.ObjectId(resumeId as any),
        status: { $in: ['SCHEDULED', 'CONFIRMED', 'RESCHEDULED'] },
      }),
    );

    if (existingInterview) {
      throw new BadRequestException(
        'Đã có lịch phỏng vấn chưa hoàn thành cho hồ sơ này',
      );
    }

    // Tạo lịch phỏng vấn
    const newInterview = await this.interviewModel.create({
      resumeId: new mongoose.Types.ObjectId(resumeId as any),
      jobId: new mongoose.Types.ObjectId(jobId as any),
      candidateId: resume.userId,
      interviewerId: user._id,
      scheduledDate: scheduledDateObj,
      location: location || undefined,
      interviewType: interviewType || 'OFFLINE',
      meetingLink: meetingLink || undefined,
      notes: notes || undefined,
      status: 'SCHEDULED',
      createdBy: {
        _id: user._id,
        email: user.email,
      },
    });

    // Tự động cập nhật Resume status thành 'INTERVIEW_SCHEDULED'
    await this.resumeModel.updateOne(
      { _id: resumeId },
      {
        $set: {
          status: 'INTERVIEW_SCHEDULED',
          updatedBy: {
            _id: user._id,
            email: user.email,
          },
        },
        $push: {
          history: {
            status: 'INTERVIEW_SCHEDULED',
            updatedAt: new Date(),
            updatedBy: {
              _id: user._id,
              email: user.email,
            },
          },
        },
      },
    );

    // Lấy thông tin ứng viên để gửi email và notification
    const candidate = await this.userModel.findById(resume.userId);
    const populatedInterview = await this.interviewModel
      .findById(newInterview._id)
      .populate('jobId', 'name company')
      .populate('interviewerId', 'name email')
      .exec();

    // Tạo notification cho ứng viên
    if (candidate) {
      await this.notificationsService.create({
        userId: candidate._id,
        title: 'Bạn có lịch phỏng vấn mới',
        message: `Bạn đã được mời phỏng vấn cho vị trí "${(populatedInterview?.jobId as any)?.name || job.name}". Lịch phỏng vấn: ${scheduledDateObj.toLocaleString('vi-VN')}`,
        type: 'INTERVIEW_SCHEDULED',
        interviewId: newInterview._id.toString(),
        resumeId: resumeId.toString(),
        jobId: jobId.toString(),
        metadata: {
          scheduledDate: scheduledDateObj,
          location: location,
          interviewType: interviewType || 'OFFLINE',
          meetingLink: meetingLink,
        },
      });

      // Gửi email cho ứng viên
      try {
        const formattedDate = new Date(scheduledDate).toLocaleString('vi-VN', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });

        await this.mailerService.sendMail({
          to: candidate.email,
          from: '"ITViec Support" <support@itviec.com>',
          subject: `Lịch phỏng vấn mới - ${(populatedInterview?.jobId as any)?.name || job.name}`,
          template: 'interview-scheduled',
          context: {
            candidateName: candidate.name || 'Ứng viên',
            jobName: (populatedInterview?.jobId as any)?.name || job.name,
            companyName: (populatedInterview?.jobId as any)?.company?.name || (job.company as any)?.name,
            scheduledDate: formattedDate,
            location: location || 'Chưa cập nhật',
            interviewType: interviewType === 'ONLINE' ? 'Trực tuyến' : interviewType === 'HYBRID' ? 'Kết hợp' : 'Trực tiếp',
            meetingLink: meetingLink || '',
            notes: notes || '',
            interviewerName: (populatedInterview?.interviewerId as any)?.name || user.email,
          },
        });
      } catch (emailError) {
        console.error('Lỗi khi gửi email thông báo lịch phỏng vấn:', emailError);
        // Không throw error để không ảnh hưởng đến việc tạo interview
      }
    }

    return {
      _id: newInterview._id,
      createdAt: newInterview.createdAt,
    };
  }

  /**
   * Lấy danh sách lịch phỏng vấn (có phân trang)
   */
  async findAll(
    currentPage: number,
    limitPage: number,
    queryString: string,
    user?: IUser,
  ) {
    const { filter, sort, population } = aqp(queryString);
    delete filter.current;
    delete filter.pageSize;
    let offset = (+currentPage - 1) * (+limitPage);
    let defaultLimit = +limitPage ? +limitPage : 10;

    // HR/EMPLOYER chỉ xem lịch phỏng vấn của công ty mình
    const roleName = (user as any)?.role?.name;
    if (user && (roleName === 'EMPLOYER' || roleName === 'HR')) {
      let companyId = (user as any)?.company?._id;
      if (!companyId && user?._id) {
        const u = await this.userModel.findById(user._id).select('company');
        companyId = (u as any)?.company?._id;
      }
      if (companyId) {
        // Lấy danh sách Resume của công ty này
        const resumes = await this.resumeModel
          .find(this.withActiveFilter({ companyId }))
          .select('_id');
        const resumeIds = resumes.map((r) => r._id);
        // @ts-ignore
        filter.resumeId = { $in: resumeIds };
      } else {
        // @ts-ignore
        filter.resumeId = '__none__';
      }
    }

    // Ứng viên chỉ xem lịch phỏng vấn của mình
    if (user && roleName === 'USER') {
      // @ts-ignore
      filter.candidateId = user._id;
    }

    const totalItems = (
      await this.interviewModel.find(this.withActiveFilter(filter))
    ).length;
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.interviewModel
      .find(this.withActiveFilter(filter))
      .skip(offset)
      .limit(defaultLimit)
      .sort(sort as any)
      .populate(population)
      .populate('resumeId')
      .populate('jobId', 'name company')
      .populate('candidateId', 'name email phone avatar')
      .populate('interviewerId', 'name email')
      .exec();

    return {
      meta: {
        current: currentPage,
        pageSize: limitPage,
        pages: totalPages,
        total: totalItems,
      },
      result,
    };
  }

  /**
   * Lấy chi tiết lịch phỏng vấn
   */
  async findOne(id: string, user?: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Interview ID không hợp lệ');
    }

    const interview = await this.interviewModel
      .findOne(
        this.withActiveFilter({
          _id: new mongoose.Types.ObjectId(id),
        }),
      )
      .populate('resumeId')
      .populate('jobId')
      .populate('candidateId')
      .populate('interviewerId')
      .exec();

    if (!interview) {
      throw new BadRequestException('Không tìm thấy lịch phỏng vấn');
    }

    // Kiểm tra quyền truy cập
    if (user) {
      const roleName = (user as any)?.role?.name;
      const isCandidate = interview.candidateId.toString() === user._id.toString();
      const isInterviewer = interview.interviewerId.toString() === user._id.toString();

      if (roleName === 'USER' && !isCandidate) {
        throw new ForbiddenException('Bạn không có quyền xem lịch phỏng vấn này');
      }

      if ((roleName === 'HR' || roleName === 'EMPLOYER') && !isInterviewer) {
        // Kiểm tra xem có phải công ty của HR không
        const resume = await this.resumeModel.findById(interview.resumeId);
        let companyId = (user as any)?.company?._id;
        if (!companyId && user?._id) {
          const u = await this.userModel.findById(user._id).select('company');
          companyId = (u as any)?.company?._id;
        }

        if (companyId && resume?.companyId.toString() !== companyId.toString()) {
          throw new ForbiddenException('Bạn không có quyền xem lịch phỏng vấn này');
        }
      }
    }

    return interview;
  }

  /**
   * Cập nhật lịch phỏng vấn
   */
  async update(
    id: string,
    updateInterviewDto: UpdateInterviewDto,
    user: IUser,
  ) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Interview ID không hợp lệ');
    }

    const interview = await this.interviewModel.findOne(
      this.withActiveFilter({
        _id: new mongoose.Types.ObjectId(id),
      }),
    );

    if (!interview) {
      throw new BadRequestException('Không tìm thấy lịch phỏng vấn');
    }

    // Kiểm tra quyền: chỉ HR/EMPLOYER hoặc ứng viên (để xác nhận) mới được cập nhật
    const roleName = (user as any)?.role?.name;
    const isInterviewer = interview.interviewerId.toString() === user._id.toString();
    const isCandidate = interview.candidateId.toString() === user._id.toString();

    if (roleName === 'USER' && !isCandidate) {
      throw new ForbiddenException('Bạn không có quyền cập nhật lịch phỏng vấn này');
    }

    if ((roleName === 'HR' || roleName === 'EMPLOYER') && !isInterviewer) {
      throw new ForbiddenException('Bạn không có quyền cập nhật lịch phỏng vấn này');
    }

    // Ứng viên chỉ được cập nhật status thành CONFIRMED
    if (roleName === 'USER' && isCandidate) {
      if (updateInterviewDto.status && updateInterviewDto.status !== 'CONFIRMED') {
        throw new BadRequestException('Ứng viên chỉ có thể xác nhận tham gia (CONFIRMED)');
      }
      updateInterviewDto.status = 'CONFIRMED';
    }

    // HR có thể cập nhật tất cả thông tin
    const updatePayload: any = {
      ...updateInterviewDto,
      updatedBy: {
        _id: user._id,
        email: user.email,
      },
    };

    // Nếu reschedule, cập nhật status thành RESCHEDULED
    if (updateInterviewDto.scheduledDate && interview.scheduledDate.getTime() !== new Date(updateInterviewDto.scheduledDate).getTime()) {
      updatePayload.status = 'RESCHEDULED';
    }

    return await this.interviewModel.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      { $set: updatePayload },
    );
  }

  /**
   * Ứng viên xác nhận tham gia phỏng vấn
   */
  async confirm(id: string, user: IUser) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Interview ID không hợp lệ');
    }

    const interview = await this.interviewModel.findOne(
      this.withActiveFilter({
        _id: new mongoose.Types.ObjectId(id),
      }),
    );

    if (!interview) {
      throw new BadRequestException('Không tìm thấy lịch phỏng vấn');
    }

    // Kiểm tra quyền: chỉ ứng viên mới được xác nhận
    if (interview.candidateId.toString() !== user._id.toString()) {
      throw new ForbiddenException('Bạn không có quyền xác nhận lịch phỏng vấn này');
    }

    // Cập nhật status thành CONFIRMED
    await this.interviewModel.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      {
        $set: {
          status: 'CONFIRMED',
          updatedBy: {
            _id: user._id,
            email: user.email,
          },
        },
      },
    );

    // Cập nhật Resume status thành INTERVIEW_CONFIRMED
    await this.resumeModel.updateOne(
      { _id: interview.resumeId },
      {
        $set: {
          status: 'INTERVIEW_CONFIRMED',
          updatedBy: {
            _id: user._id,
            email: user.email,
          },
        },
        $push: {
          history: {
            status: 'INTERVIEW_CONFIRMED',
            updatedAt: new Date(),
            updatedBy: {
              _id: user._id,
              email: user.email,
            },
          },
        },
      },
    );

    // Tạo notification cho HR
    const interviewer = await this.userModel.findById(interview.interviewerId);
    if (interviewer) {
      const job = await this.jobModel.findById(interview.jobId);
      await this.notificationsService.create({
        userId: interviewer._id.toString(),
        title: 'Ứng viên đã xác nhận tham gia phỏng vấn',
        message: `Ứng viên đã xác nhận tham gia phỏng vấn cho vị trí "${job?.name || ''}"`,
        type: 'INTERVIEW_CONFIRMED',
        interviewId: interview._id.toString(),
        resumeId: interview.resumeId.toString(),
        jobId: interview.jobId.toString(),
      });
    }

    return { message: 'Đã xác nhận tham gia phỏng vấn thành công' };
  }

  /**
   * HR cập nhật kết quả phỏng vấn
   */
  async updateResult(
    id: string,
    updateResultDto: UpdateInterviewResultDto,
    user: IUser,
  ) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Interview ID không hợp lệ');
    }

    const interview = await this.interviewModel.findOne(
      this.withActiveFilter({
        _id: new mongoose.Types.ObjectId(id),
      }),
    );

    if (!interview) {
      throw new BadRequestException('Không tìm thấy lịch phỏng vấn');
    }

    // Kiểm tra quyền: chỉ HR/EMPLOYER mới được cập nhật kết quả
    const roleName = (user as any)?.role?.name;
    if (roleName !== 'HR' && roleName !== 'EMPLOYER' && roleName !== 'ADMIN') {
      throw new ForbiddenException('Bạn không có quyền cập nhật kết quả phỏng vấn');
    }

    const isInterviewer = interview.interviewerId.toString() === user._id.toString();
    if (!isInterviewer) {
      // Kiểm tra xem có phải công ty của HR không
      const resume = await this.resumeModel.findById(interview.resumeId);
      let companyId = (user as any)?.company?._id;
      if (!companyId && user?._id) {
        const u = await this.userModel.findById(user._id).select('company');
        companyId = (u as any)?.company?._id;
      }

      if (companyId && resume?.companyId.toString() !== companyId.toString()) {
        throw new ForbiddenException('Bạn không có quyền cập nhật kết quả phỏng vấn này');
      }
    }

    // Cập nhật kết quả
    await this.interviewModel.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      {
        $set: {
          status: 'COMPLETED',
          result: updateResultDto.result,
          feedback: updateResultDto.feedback,
          updatedBy: {
            _id: user._id,
            email: user.email,
          },
        },
      },
    );

    // Cập nhật Resume status dựa trên kết quả
    let resumeStatus = 'INTERVIEW_COMPLETED';
    if (updateResultDto.result === 'PASSED') {
      resumeStatus = 'OFFERED';
    } else if (updateResultDto.result === 'FAILED') {
      resumeStatus = 'REJECTED';
    }

    await this.resumeModel.updateOne(
      { _id: interview.resumeId },
      {
        $set: {
          status: resumeStatus,
          updatedBy: {
            _id: user._id,
            email: user.email,
          },
        },
        $push: {
          history: {
            status: resumeStatus,
            updatedAt: new Date(),
            updatedBy: {
              _id: user._id,
              email: user.email,
            },
          },
        },
      },
    );

    // Tạo notification cho ứng viên
    const candidate = await this.userModel.findById(interview.candidateId);
    if (candidate) {
      const job = await this.jobModel.findById(interview.jobId);
      let notificationTitle = '';
      let notificationMessage = '';

      if (updateResultDto.result === 'PASSED') {
        notificationTitle = 'Chúc mừng! Bạn đã vượt qua vòng phỏng vấn';
        notificationMessage = `Bạn đã vượt qua vòng phỏng vấn cho vị trí "${job?.name || ''}". Chúng tôi sẽ liên hệ với bạn sớm nhất có thể.`;
      } else if (updateResultDto.result === 'FAILED') {
        notificationTitle = 'Kết quả phỏng vấn';
        notificationMessage = `Cảm ơn bạn đã tham gia phỏng vấn cho vị trí "${job?.name || ''}". Rất tiếc bạn chưa phù hợp với vị trí này.`;
      }

      if (notificationTitle) {
        await this.notificationsService.create({
          userId: candidate._id.toString(),
          title: notificationTitle,
          message: notificationMessage,
          type: updateResultDto.result === 'PASSED' ? 'OFFER_SENT' : 'RESUME_REJECTED',
          interviewId: interview._id.toString(),
          resumeId: interview.resumeId.toString(),
          jobId: interview.jobId.toString(),
          metadata: {
            result: updateResultDto.result,
            feedback: updateResultDto.feedback,
          },
        });
      }
    }

    return { message: 'Đã cập nhật kết quả phỏng vấn thành công' };
  }

  /**
   * Hủy lịch phỏng vấn
   */
  async remove(id: string, user: IUser, cancelReason?: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Interview ID không hợp lệ');
    }

    const interview = await this.interviewModel.findOne(
      this.withActiveFilter({
        _id: new mongoose.Types.ObjectId(id),
      }),
    );

    if (!interview) {
      throw new BadRequestException('Không tìm thấy lịch phỏng vấn');
    }

    // Kiểm tra quyền: chỉ HR/EMPLOYER mới được hủy
    const roleName = (user as any)?.role?.name;
    if (roleName !== 'HR' && roleName !== 'EMPLOYER' && roleName !== 'ADMIN') {
      throw new ForbiddenException('Bạn không có quyền hủy lịch phỏng vấn');
    }

    const isInterviewer = interview.interviewerId.toString() === user._id.toString();
    if (!isInterviewer) {
      // Kiểm tra xem có phải công ty của HR không
      const resume = await this.resumeModel.findById(interview.resumeId);
      let companyId = (user as any)?.company?._id;
      if (!companyId && user?._id) {
        const u = await this.userModel.findById(user._id).select('company');
        companyId = (u as any)?.company?._id;
      }

      if (companyId && resume?.companyId.toString() !== companyId.toString()) {
        throw new ForbiddenException('Bạn không có quyền hủy lịch phỏng vấn này');
      }
    }

    if (!cancelReason || !cancelReason.trim()) {
      throw new BadRequestException('Lý do hủy không được để trống');
    }

    // Cập nhật status thành CANCELLED với lý do
    await this.interviewModel.updateOne(
      { _id: new mongoose.Types.ObjectId(id) },
      {
        $set: {
          status: 'CANCELLED',
          cancelReason: cancelReason.trim(),
          cancelledAt: new Date(),
          updatedBy: {
            _id: user._id,
            email: user.email,
          },
        },
      },
    );

    // Cập nhật Resume status về INTERVIEW_CANCELLED để thể hiện trạng thái hiện tại
    await this.resumeModel.updateOne(
      { _id: interview.resumeId },
      {
        $set: {
          status: RESUME_STATUS.INTERVIEW_CANCELLED,
          updatedBy: {
            _id: user._id,
            email: user.email,
          },
        },
        $push: {
          history: {
            status: RESUME_STATUS.INTERVIEW_CANCELLED,
            updatedAt: new Date(),
            updatedBy: {
              _id: user._id,
              email: user.email,
            },
          },
        },
      },
    );

    // Tạo notification cho ứng viên
    const candidate = await this.userModel.findById(interview.candidateId);
    if (candidate) {
      const job = await this.jobModel.findById(interview.jobId);
      await this.notificationsService.create({
        userId: candidate._id.toString(),
        title: 'Lịch phỏng vấn đã bị hủy',
        message: `Lịch phỏng vấn cho vị trí "${job?.name || ''}" đã bị hủy. Lý do: ${cancelReason}`,
        type: 'INTERVIEW_CANCELLED',
        interviewId: interview._id.toString(),
        resumeId: interview.resumeId.toString(),
        jobId: interview.jobId.toString(),
        metadata: {
          cancelReason: cancelReason,
        },
      });
    }

    return { message: 'Đã hủy lịch phỏng vấn thành công' };
  }

  /**
   * Ứng viên xem lịch phỏng vấn của mình
   */
  async getMyInterviews(user: IUser) {
    return await this.interviewModel
      .find(
        this.withActiveFilter({
          candidateId: user._id,
        }),
      )
      .sort('-scheduledDate')
      .populate('resumeId')
      .populate('jobId', 'name company')
      .populate('interviewerId', 'name email')
      .exec();
  }
}

