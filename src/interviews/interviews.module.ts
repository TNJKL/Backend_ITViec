import { Module } from '@nestjs/common';
import { InterviewsService } from './interviews.service';
import { InterviewsController } from './interviews.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Interview, InterviewSchema } from './schemas/interview.schema';
import { Resume, ResumeSchema } from 'src/resumes/schemas/resume.schema';
import { Job, JobSchema } from 'src/jobs/schemas/job.schema';
import { User as UserEntity, UserSchema } from 'src/users/schemas/user.schema';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { MailModule } from 'src/mail/mail.module';

@Module({
  controllers: [InterviewsController],
  providers: [InterviewsService],
  imports: [
    MongooseModule.forFeature([
      { name: Interview.name, schema: InterviewSchema },
      { name: Resume.name, schema: ResumeSchema },
      { name: Job.name, schema: JobSchema },
      { name: UserEntity.name, schema: UserSchema },
    ]),
    NotificationsModule,
    MailModule,
  ],
  exports: [InterviewsService],
})
export class InterviewsModule {}

