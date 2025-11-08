import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { IsEmail, isEmail, IsNotEmpty } from 'class-validator';
import { Role } from 'src/roles/schemas/role.schema';
export type UserDocument = HydratedDocument<User>;

@Schema({timestamps: true})
export class User {
  
  @Prop()
  name: string;
  
  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  password: string;
  
  @Prop()
  age: number; 
  
  @Prop()
  gender: string;
  
  @Prop()
  address: string;

  @Prop()
  phone: string;

  @Prop()
  avatar: string;

  //database thêm
  @Prop()
  aboutMe: string;

  @Prop({ type: [Object], default: [] })
  education: {
    school: string;
    degree: string;
    major: string;
    currentlyStudying?: boolean;
    from: Date;
    to?: Date;
    details?: string;
  }[];

  @Prop({ type: [Object], default: [] })
  experience: {
    position: string;
    companyName: string;
    from: Date;
    to?: Date;
    description?: string;
    projects?: string;
  }[];

  @Prop({ type: Object, default: {} })
  skills: {
    core: string[];
    soft: string[];
  };

  @Prop({ type: [Object], default: [] })
  languages: {
    name: string;
    level: string;
  }[];

  @Prop({ type: [Object], default: [] })
  projects: {
    name: string;
    from: Date;
    to?: Date;
    description?: string;
    website?: string;
  }[];

  @Prop({ type: [Object], default: [] })
  certificates: {
    name: string;
    organization: string;
    from: Date;
    to?: Date;
    link?: string;
    description?: string;
  }[];

  @Prop({ type: [Object], default: [] })
  awards: {
    name: string;
    organization: string;
    date: Date;
    description?: string;
  }[];

  //database thêm

  @Prop({type: Object})
  company:{
    _id: mongoose.Schema.Types.ObjectId;  
    name: string;
  }
  
  @Prop({type : mongoose.Schema.Types.ObjectId, ref : Role.name})
  role: mongoose.Schema.Types.ObjectId;


  @Prop()
  refreshToken: string;

  @Prop({type: Object})
    createdBy: {
      _id: mongoose.Schema.Types.ObjectId;
      email : string;
    }
   
   @Prop({type: Object})
    updatedBy: {
      _id: mongoose.Schema.Types.ObjectId;
      email : string;
    }
  
    @Prop({type: Object})
    deletedBy: {
      _id: mongoose.Schema.Types.ObjectId;
      email : string;
    }
  
    @Prop()
    createdAt: Date;
    
    @Prop()
    updatedAt: Date;
  
    @Prop()
    isDeleted : boolean;
  
    @Prop()
    deteleAt : Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
