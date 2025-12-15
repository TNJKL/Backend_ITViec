import { Module } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { Job, JobSchema } from './schemas/job.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { User as UserEntity, UserSchema } from 'src/users/schemas/user.schema';
import { UserPackagesModule } from 'src/user-packages/user-packages.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Job.name, schema: JobSchema },
      { name: UserEntity.name, schema: UserSchema }
    ]),
    UserPackagesModule
  ],
  controllers: [JobsController],
  providers: [JobsService]
})
export class JobsModule {}
