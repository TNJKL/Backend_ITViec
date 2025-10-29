import { IsEmail, IsMongoId, IsNotEmpty } from "class-validator";
import e from "express";
import mongoose from "mongoose";

export class CreateResumeDto {
@IsNotEmpty({message: 'Email không được để trống'})
@IsEmail({}, {message: 'Email không đúng định dạng'})
email: string;

@IsNotEmpty({message: 'userId không được để trống'})
userId: mongoose.Schema.Types.ObjectId;

@IsNotEmpty({message: 'url không được để trống'})
url: string;

@IsNotEmpty({message: 'status không được để trống'})
status: string;

@IsNotEmpty({message: 'companyId không được để trống'})
companyId: mongoose.Schema.Types.ObjectId;

@IsNotEmpty({message: 'jobId không được để trống'})
jobId: mongoose.Schema.Types.ObjectId;


}

export class CreateUserCvDto {
@IsNotEmpty({message: 'url không được để trống'})
url: string;

@IsNotEmpty({message: 'companyId không được để trống'})
@IsMongoId({message: 'companyId phải là định dạng MongoId'})
companyId: mongoose.Schema.Types.ObjectId;

@IsNotEmpty({message: 'jobId không được để trống'})
@IsMongoId({message: 'jobId phải là định dạng MongoId'})
jobId: mongoose.Schema.Types.ObjectId;

}
