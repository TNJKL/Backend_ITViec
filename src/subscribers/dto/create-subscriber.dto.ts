import { IsArray, IsEmail, IsNotEmpty, IsString } from "class-validator";

export class CreateSubscriberDto {

    @IsNotEmpty({message: 'Tên không được để trống'})
    name: string;
  
    @IsNotEmpty({message: 'Email không được để trống'})
    @IsEmail({}, {message: 'Email không đúng định dạng'})
    email: string;

    @IsNotEmpty({message: 'Skill không được để trống'})
    @IsArray({message: 'Skills phải là một mảng'})
    @IsString({ each : true,message: 'Skill phải là string'})
    skills: string[];

}
