import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, SchemaTypes } from 'mongoose';

export type EmployerApplicationDocument = HydratedDocument<EmployerApplication>;

@Schema({ timestamps: true })
export class EmployerApplication {
  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  email: string;

  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  companyName: string;

  @Prop({ required: true })
  companyAddress: string;

  @Prop()
  website: string;

  @Prop({ enum: ['pending', 'approved', 'rejected'], default: 'pending' })
  status: string;

  @Prop()
  note: string;
}

export const EmployerApplicationSchema = SchemaFactory.createForClass(EmployerApplication);

