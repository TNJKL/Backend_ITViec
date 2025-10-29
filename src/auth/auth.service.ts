import { BadRequestException, Injectable } from '@nestjs/common';
import { UsersService } from 'src/users/users.service';
import { JwtService } from '@nestjs/jwt';
import { IUser } from 'src/users/users.interface';
import { CreateUserDto, RegisterUserDto } from 'src/users/dto/create-user.dto';
import { genSaltSync, hashSync } from 'bcryptjs';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from 'src/users/schemas/user.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { create } from 'domain';
import { ConfigService } from '@nestjs/config';
import ms from 'ms';
import { Response } from 'express';
import { RolesService } from 'src/roles/roles.service';
@Injectable()
export class AuthService {
    constructor(
      private usersService: UsersService, 
      private configService: ConfigService,
      private jwtService : JwtService,
      private rolesService : RolesService,
      @InjectModel(User.name) private userModel: SoftDeleteModel<UserDocument>
    ){}

  //thư viện passport sẽ ném username và pass vào đây
     async validateUser(username: string, pass: string): Promise<any>  {
    const user = await this.usersService.findOneByUsername(username);
     if(user){
      const isValid = this.usersService.isValidPassword(pass, user.password)
      if(isValid === true){
        const userRole = user.role as unknown as { _id: string , name : string};
        const temp = await this.rolesService.findOne(userRole._id);

         const objUser = {
          ...user.toObject(),
          permissions : temp?.permissions ?? []
         }
        return objUser;
      }
     }
    
    return null;
  }

   

  async login(user: IUser , response: Response) {
    const {_id ,name , email , role , permissions} = user ;
    const payload = { 
       sub : "token login",
       iss: "from server",
       _id,
       name,
       email,
       role
     };

     const refresh_token = this.createRefreshToken(payload); //tao refresh token
     await this.usersService.updateUserToken(refresh_token , _id); //luu refresh token vao db
     //set refresh_token as cookie
      response.cookie("refresh_token" , refresh_token, {
        httpOnly: true,
        maxAge: ms(this.configService.get<string>('JWT_REFRESH_EXPIRE')), 
        // secure : true , //https
      });
    return {
      access_token: this.jwtService.sign(payload),
      user: {
      _id,
      name,
      email,
      role,
      permissions
    }
  };
}



  
  async register(user: RegisterUserDto){
     let newUser = await this.usersService.register(user);

     return {
        _id: newUser?._id,
        createdAt: newUser?.createdAt,
     }
    }
    
  //tao refresh token
  createRefreshToken = (payload: any)=>{
    const refreshToken = this.jwtService.sign(payload,
      {
        secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET'),
        expiresIn: ms(this.configService.get<string>('JWT_REFRESH_EXPIRE')) /1000,
      }
    );
    return refreshToken;
  }
  

  processNewToken = async(refreshToken: string , response: Response) =>{
   try{
    this.jwtService.verify(refreshToken , {
        secret: this.configService.get<string>('JWT_REFRESH_TOKEN_SECRET')
      });
      let user = await this.usersService.findUserByToken(refreshToken);// tim kiem user tu DB
      if(user){
        const {_id ,name , email , role} = user ;
        const payload = { 
          sub : "token refresh",
          iss: "from server",
          _id,
          name,
          email,
          role
        };

     const refresh_token = this.createRefreshToken(payload); //tao refresh token
     await this.usersService.updateUserToken(refresh_token , _id.toString()); //luu refresh token vao db

     //fetch user role
     const userRole = user.role as unknown as { _id: string , name : string};
     const temp = await this.rolesService.findOne(userRole._id);

      //xoa refresh token cu va tao refresh token moi
     response.clearCookie("refresh_token");
     //set refresh_token as cookie
      response.cookie("refresh_token" , refresh_token, {
        httpOnly: true,
        maxAge: ms(this.configService.get<string>('JWT_REFRESH_EXPIRE')), 
        // secure : true , //https
      });
    return {
      access_token: this.jwtService.sign(payload),
      user: {
      _id,
      name,
      email,
      role,
      permissions : temp?.permissions ?? []
      }
   }
    }
      else{
        throw new BadRequestException(' Refresh token không hợp lệ , vui lòng login');
      }
      
     
   }catch(err){
    throw new BadRequestException(' Refresh token không hợp lệ , vui lòng login');
   }
  }


  // logout = async (user: IUser , response: Response) =>{
  //   await this.usersService.updateUserToken("", user._id);
  //   response.clearCookie("refresh_token");
  //   return "Logout successfully";
  // } 

     logoutByToken = async(refreshToken : string , response: Response) =>{
      let user = await this.usersService.findUserByToken(refreshToken);// tim kiem user tu DB
      if(user){
        await this.usersService.updateUserToken("" , user._id.toString());
        response.clearCookie("refresh_token");
        return "Logout successfully";
      }
     }
}

