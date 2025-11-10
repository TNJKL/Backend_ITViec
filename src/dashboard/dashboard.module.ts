import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { User, UserSchema } from 'src/users/schemas/user.schema';
import { Role, RoleSchema } from 'src/roles/schemas/role.schema';
import { Job, JobSchema } from 'src/jobs/schemas/job.schema';
import { Resume, ResumeSchema } from 'src/resumes/schemas/resume.schema';
import { Company, CompanySchema } from 'src/companies/schemas/company.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Job.name, schema: JobSchema },
      { name: Resume.name, schema: ResumeSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}

