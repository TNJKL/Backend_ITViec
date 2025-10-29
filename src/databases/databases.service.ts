import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Permission, PermissionDocument } from 'src/permissions/schemas/permission.schema';
import { Role, RoleDocument } from 'src/roles/schemas/role.schema';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { UsersService } from 'src/users/users.service';
import { ADMIN_ROLE, INIT_PERMISSIONS, USER_ROLE } from './sample';
import { Logger } from '@nestjs/common';

@Injectable()
export class DatabasesService implements OnModuleInit {
   constructor(
      @InjectModel(User.name) private userModel: SoftDeleteModel<UserDocument>,
      @InjectModel(Permission.name) private permissionModel: SoftDeleteModel<PermissionDocument>,
      @InjectModel(Role.name) private roleModel: SoftDeleteModel<RoleDocument>,

      private configService: ConfigService,
      private usersService: UsersService,
   ) {}
  


   //them logger 
   private readonly logger = new Logger(DatabasesService.name);


   async onModuleInit() {
      const isInit = this.configService.get<string>('SHOULD_INIT');
      if(Boolean(isInit)) {
         const countUser = await this.userModel.count({});
         const countPermission = await this.permissionModel.count({});
         const countRole = await this.roleModel.count({});
         
         //create permissons
         if(countPermission === 0) { 
               await this.permissionModel.insertMany(INIT_PERMISSIONS); 
         }
         //create roles
         if(countRole === 0) {
                const permissions = await this.permissionModel.find({}).select("_id");
                await this.roleModel.insertMany([
                  {  
                     name : ADMIN_ROLE,
                     description : 'Administrator',
                     isActive : true,
                     permissions : permissions
                  },
                  {
                     name : USER_ROLE,
                     description : 'User',
                     isActive : true,
                     permissions : []
                  }
                ]);
         }

         if(countUser === 0){
            const adminRole = await this.roleModel.findOne({ name : ADMIN_ROLE });
            const userRole = await this.roleModel.findOne({ name : USER_ROLE });

            await this.userModel.insertMany([
               {
                  name : "Admin",
                  email : "admin@gmail.com",
                  password : this.usersService.getHashPassword(this.configService.get<string>('INIT_PASSWORD')),
                  age : 21,
                  gender: 'Male',
                  address : "123 Admin Street",
                  role: adminRole?._id
               },

               {
                  name : "User",
                  email : "user@gmail.com",
                  password : this.usersService.getHashPassword(this.configService.get<string>('INIT_PASSWORD')),
                  age : 25,
                  gender: 'Male',
                  address : "123 User Street",
                  role: userRole?._id
               },

               {  
                  name : "Thi",
                  email : "Thi@gmail.com",
                  password : this.usersService.getHashPassword(this.configService.get<string>('INIT_PASSWORD')),
                  age : 21,
                  gender: 'Male',
                  address : "Ninh Thuan",
                  role: adminRole?._id
               },
            ])
         }
    
         if(countUser > 0  && countRole > 0 && countPermission > 0) {
            this.logger.log('Sample data already initialized.');
         }
      }
   }
}
