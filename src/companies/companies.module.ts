import { Module } from '@nestjs/common';
import { CompaniesService } from './companies.service';
import { CompaniesController } from './companies.controller';
import { Company, CompanySchema } from './schemas/company.schema';
import { MongooseModule } from '@nestjs/mongoose';
import { User as UserEntity, UserSchema } from 'src/users/schemas/user.schema';

@Module({
  imports : [MongooseModule.forFeature([
    { name: Company.name, schema: CompanySchema },
    { name: UserEntity.name, schema: UserSchema }
  ])],
  controllers: [CompaniesController],
  providers: [CompaniesService]
})
export class CompaniesModule {}
