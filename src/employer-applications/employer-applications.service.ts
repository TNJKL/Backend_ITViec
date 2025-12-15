import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EmployerApplication, EmployerApplicationDocument } from './schemas/employer-application.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { CreateEmployerApplicationDto } from './dto/create-employer-application.dto';
import { Role, RoleDocument } from 'src/roles/schemas/role.schema';
import { USER_ROLE, ADMIN_ROLE } from 'src/databases/sample';
import { UsersService } from 'src/users/users.service';
import { USER_ROLE as DEFAULT_USER_ROLE } from 'src/databases/sample';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import { MailerService } from '@nestjs-modules/mailer';
import { Company, CompanyDocument } from 'src/companies/schemas/company.schema';
import mongoose from 'mongoose';

@Injectable()
export class EmployerApplicationsService {
  constructor(
    @InjectModel(EmployerApplication.name) private appModel: SoftDeleteModel<EmployerApplicationDocument>,
    @InjectModel(Role.name) private roleModel: SoftDeleteModel<RoleDocument>,
    @InjectModel(Company.name) private companyModel: SoftDeleteModel<CompanyDocument>,
    private usersService: UsersService,
    private mailerService: MailerService,
    private configService: ConfigService,
  ) {}

  async create(dto: CreateEmployerApplicationDto) {
    const existed = await this.appModel.findOne({ email: dto.email, status: 'pending' });
    if (existed) {
      throw new BadRequestException('Bạn đã gửi đăng ký, vui lòng chờ duyệt.');
    }
    return this.appModel.create({ ...dto, status: 'pending' });
  }

  async findAll(query: any) {
    const { page = 1, limit = 20, status } = query;
    const filter: any = {};
    if (status) filter.status = status;
    const total = await this.appModel.countDocuments(filter);
    const data = await this.appModel.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(+limit);
    return { data, meta: { page: +page, limit: +limit, total } };
  }

  async approve(id: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new BadRequestException('Id không hợp lệ');
    const app = await this.appModel.findById(id);
    if (!app) throw new NotFoundException('Không tìm thấy đăng ký');
    if (app.status === 'approved') throw new BadRequestException('Đã duyệt trước đó');

    // Tạo công ty (hoặc lấy nếu trùng tên)
    let company = await this.companyModel.findOne({ name: app.companyName });
    if (!company) {
      company = await this.companyModel.create({
        name: app.companyName,
        address: app.companyAddress,
        website: app.website,
      });
    }

    // Lấy role EMPLOYER
    const employerRole = await this.roleModel.findOne({ name: 'EMPLOYER' });
    if (!employerRole) {
      throw new BadRequestException('Role EMPLOYER chưa được khởi tạo');
    }

    // Tạo mật khẩu tạm
    const tempPassword = randomBytes(4).toString('hex'); // 8 ký tự

    // Tạo user employer (dùng create để giữ nguyên role EMPLOYER)
    const newUser = await this.usersService.create({
      name: app.name,
      email: app.email,
      password: tempPassword,
      age: 18,
      gender: 'Other',
      address: app.companyAddress || 'Chưa cập nhật',
      phone: app.phone,
      role: employerRole._id,
      company: company._id,
    } as any, { _id: employerRole._id, email: 'system@itviec.com' } as any);

    // Cập nhật trạng thái application
    app.status = 'approved';
    await app.save();

    // Gửi mail thông báo
    try {
      await this.mailerService.sendMail({
        to: app.email,
        subject: 'Đăng ký nhà tuyển dụng được duyệt',
        template: 'employer-approved',
        context: {
          name: app.name,
          company: app.companyName,
          tempPassword,
        },
      });
    } catch (e) {
      // log, không throw để không rollback
      console.error('Send mail approve employer failed', e);
    }

    return { _id: newUser?._id, applicationId: app._id };
  }

  async reject(id: string, note?: string) {
    if (!mongoose.Types.ObjectId.isValid(id)) throw new BadRequestException('Id không hợp lệ');
    const app = await this.appModel.findById(id);
    if (!app) throw new NotFoundException('Không tìm thấy đăng ký');
    app.status = 'rejected';
    app.note = note;
    await app.save();
    return { _id: app._id, status: app.status };
  }
}

