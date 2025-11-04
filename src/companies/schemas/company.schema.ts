import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { IsEmail, isEmail, IsNotEmpty } from 'class-validator';
export type CompanyDocument = HydratedDocument<Company>;

@Schema({timestamps: true})
export class Company {

  @Prop()
  name: string;

  @Prop()
  address: string;

  @Prop({ default: 0 })
  averageRating: number;

  @Prop({ default: 0 })
  reviewsCount: number;

  @Prop()
  description: string;

  @Prop()
  logo: string;

  @Prop({ type: [String], default: [] })
  images: string[];

  @Prop({ type: [String], default: [] })
  maps: string[];
 
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

export const CompanySchema = SchemaFactory.createForClass(Company);
