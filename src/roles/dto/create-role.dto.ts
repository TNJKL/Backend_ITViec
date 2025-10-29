import { IsArray, IsBoolean, IsMongoId, IsNotEmpty } from "class-validator";
import mongoose from "mongoose";

export class CreateRoleDto {
    @IsNotEmpty({message: 'Name is required' ,})
    name: string;
    
    @IsNotEmpty({message: 'Description is required' ,})
    description: string;
    
    @IsNotEmpty({message: 'isActive is required' ,})
    @IsBoolean({message: 'isActive must be a boolean' ,})
    isActive : boolean;

    @IsNotEmpty({message: 'Permissions are required' ,})
    @IsMongoId({each: true, message: 'Each permission must be a valid Mongo ID' })
    @IsArray({message: 'Permissions must be an array' })
    permissions: mongoose.Schema.Types.ObjectId[];
}
