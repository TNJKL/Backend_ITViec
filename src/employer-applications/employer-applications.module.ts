import { Module } from '@nestjs/common';
import { EmployerApplicationsService } from './employer-applications.service';
import { EmployerApplicationsController } from './employer-applications.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { EmployerApplication, EmployerApplicationSchema } from './schemas/employer-application.schema';
import { UsersModule } from 'src/users/users.module';
import { RolesModule } from 'src/roles/roles.module';
import { Company, CompanySchema } from 'src/companies/schemas/company.schema';

@Module({
  imports: [
    UsersModule,
    RolesModule,
    MongooseModule.forFeature([
      { name: EmployerApplication.name, schema: EmployerApplicationSchema },
      { name: Company.name, schema: CompanySchema },
    ]),
  ],
  controllers: [EmployerApplicationsController],
  providers: [EmployerApplicationsService],
})
export class EmployerApplicationsModule {}

