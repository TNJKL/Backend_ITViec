import { Controller, Get, Post, Put, Render, UseGuards , Body, Res, Req} from '@nestjs/common';
import { LocalAuthGuard } from './local-auth.guard';
import { Public, ResponseMessage, User } from 'src/decorator/customize';
import { AuthService } from './auth.service';
import { RegisterUserDto, UserLoginDto } from 'src/users/dto/create-user.dto';
import { Request, Response } from 'express';
import { IUser } from 'src/users/users.interface';
import { RolesService } from 'src/roles/roles.service';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiBody, ApiTags } from '@nestjs/swagger';


@ApiTags('auth')
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly rolesService : RolesService
   ) {}
    

    @Public()
    @ResponseMessage("User Login")
    @UseGuards(LocalAuthGuard)
    @UseGuards(ThrottlerGuard) //enable throttling
    @Throttle(3 , 60) //3 requests per 60 seconds

    @ApiBody({ type: UserLoginDto, })

    @Post('/login')
    handleLogin(
      @Req() req,
      @Res({passthrough: true}) response : Response) {
      return this.authService.login(req.user , response);

    }
   
   

    //register user
    @ResponseMessage("Register a user")
    @Public()
    @Post('register')
    register(@Body() registerUserDto : RegisterUserDto){
      return this.authService.register(registerUserDto);
    }


    @ResponseMessage("Get user information")
    @Get('/account')
    async handleGetAccount(@User() user : IUser){ //custom decorator user
      const temp =  await this.rolesService.findOne(user.role._id) as any;
      user.permissions = temp.permissions;
      return  {user};
    }
    
    @Public()
    @ResponseMessage("Get user refresh token")
    @Get('/refresh')
    handleRefreshToken(
      @Req() req : Request,
      @Res({passthrough: true}) response : Response){ //ko có access token thì không cần truyền user
      const refreshToken = req.cookies["refresh_token"]
      return this.authService.processNewToken(refreshToken , response); 
    }
    

    //logout by user id
    // @ResponseMessage("User logout")
    // @Post('/logout')
    // handleLogout( 
    //   @User() user : IUser,
    //   @Res({passthrough: true}) response : Response){
    //   return this.authService.logout(user , response);
    // }
       

    //logout by token
    @ResponseMessage("User logout")
    @Post('/logout')
    handleLogout(@Req() req : Request,
    @Res({passthrough: true}) response : Response){
      const refreshToken = req.cookies["refresh_token"]
      return this.authService.logoutByToken(refreshToken , response);  
  }

}

  
  

