import { Module } from '@nestjs/common';
import { UserPackagesService } from './user-packages.service';
import { UserPackage, UserPackageSchema } from './schemas/user-package.schema';
import { ServicePackage, ServicePackageSchema } from '../service-packages/schemas/service-package.schema';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UserPackage.name, schema: UserPackageSchema },
      { name: ServicePackage.name, schema: ServicePackageSchema },
    ]),
  ],
  providers: [UserPackagesService],
  exports: [UserPackagesService],
})
export class UserPackagesModule {}



