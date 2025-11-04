import { IsArray, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateCompanyDto {
    @IsNotEmpty({message : 'Tên công ty không được để trống'})
    name : string;
    @IsNotEmpty({message :'Địa chỉ không được để trống'})
    address : string;
    @IsNotEmpty({message : 'Description không được để trống'})
    description : string;
    @IsNotEmpty({message : 'Logo không được để trống'})
    logo : string;
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  maps?: string[];
}
