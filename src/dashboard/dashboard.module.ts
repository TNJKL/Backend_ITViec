import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { Role, RoleSchema } from 'src/roles/schemas/role.schema';
import { Job, JobSchema } from 'src/jobs/schemas/job.schema';
import { Resume, ResumeSchema } from 'src/resumes/schemas/resume.schema';
import { Company, CompanySchema } from 'src/companies/schemas/company.schema';
import { ServicePackage, ServicePackageSchema } from 'src/service-packages/schemas/service-package.schema';
import { UserPackage, UserPackageSchema } from 'src/user-packages/schemas/user-package.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Job.name, schema: JobSchema },
      { name: Resume.name, schema: ResumeSchema },
      { name: Company.name, schema: CompanySchema },
      { name: ServicePackage.name, schema: ServicePackageSchema },
      { name: UserPackage.name, schema: UserPackageSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}

