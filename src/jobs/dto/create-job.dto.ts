import { Transform, Type } from "class-transformer";
import { IsArray, IsBoolean, IsDate, IsIn, IsNotEmpty, IsNotEmptyObject, IsObject, IsString, ValidateNested } from "class-validator";
import mongoose from "mongoose";
class Company {
    @IsNotEmpty()
    _id: mongoose.Schema.Types.ObjectId;

    @IsNotEmpty()
    name: string;

    @IsNotEmpty()
    logo: string;
}
export class CreateJobDto {
    @IsNotEmpty({message: 'Tên công việc không được để trống'})
    name: string;
    
    @IsArray({message: 'Skill phải là một mảng'})
    @IsString({each: true , message: 'Skill định dạng là 1 String'})
    @IsNotEmpty({message: 'Skill không được để trống'})
    skills: string[];

    @IsNotEmptyObject()
    @IsObject()
    @ValidateNested()
    @Type(()=> Company)
    company: Company; 

    @IsNotEmpty({message: 'Địa điểm không được để trống'})
    location: string; 

    @IsNotEmpty({message: 'Mô hình làm việc không được để trống'})
    @IsIn(['AT_OFFICE', 'REMOTE', 'HYBRID'], { message: 'workingModel phải là AT_OFFICE | REMOTE | HYBRID' })
    workingModel: string;

    @IsNotEmpty({message: 'Mức lương không được để trống'})
    salary: number;

    @IsNotEmpty({message: 'Số lượng không được để trống'})
    quantity: number;

    @IsNotEmpty({message: 'Cấp bậc không được để trống'})
    level: string;

    @IsNotEmpty({message: 'Mô tả không được để trống'})
    description: string;

    

    @IsNotEmpty({message: 'Ngày bắt đầu không được để trống'})
    @Transform(({ value }) => new Date(value))
    @IsDate({message: 'Ngày bắt đầu phải đúng định dạng Date'})
    startDate: Date;

    @IsNotEmpty({message: 'Ngày kết thúc không được để trống'})
    @Transform(({ value }) => new Date(value))
    @IsDate({message: 'Ngày kết thúc phải đúng định dạng Date'})
    endDate: Date;
    
    @IsNotEmpty({message: 'Trạng thái không được để trống'})
    @IsBoolean({message: 'Trạng thái phải đúng định dạng Boolean'})
    isActive: boolean;

    

}
