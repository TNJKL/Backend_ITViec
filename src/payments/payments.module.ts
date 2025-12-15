import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { ServicePackage, ServicePackageSchema } from '../service-packages/schemas/service-package.schema';
import { UserPackage, UserPackageSchema } from '../user-packages/schemas/user-package.schema';
import { UserPackagesModule } from '../user-packages/user-packages.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ServicePackage.name, schema: ServicePackageSchema },
      { name: UserPackage.name, schema: UserPackageSchema },
    ]),
    UserPackagesModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}



