import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, HydratedDocument } from 'mongoose';
import { Role } from '@app/common';

@Schema({
  timestamps: true,
})
export class User {
  @Prop()
  name: string;
  @Prop({ required: true })
  email: string;
  @Prop()
  password: string;
  @Prop({
    type: String,
    enum: Role,
    default: Role.USER,
  })
  role: Role;

  @Prop({
    type: Boolean,
    default: false,
  })
  isDeleted: boolean;

  @Prop({
    type: Boolean,
    default: false,
  })
  isVerified: boolean;

  @Prop()
  virificationCode: string;

  @Prop()
  virificationCodeExpires: Date;

  @Prop()
  passwordResetCode: string;

  @Prop({ type: Date })
  passwordResetCodeExpiresIn: Date;

  @Prop({ type: Date })
  passwordChangedAt: Date;
}

// export type UserDocument = HydratedDocument<User>;
export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);