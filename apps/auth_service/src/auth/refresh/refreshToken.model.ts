import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';


@Schema({timestamps: true})
export class RefreshToken{
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  })
  userId: string;

  @Prop({})
  refreshToken: string;

  @Prop({})
  expiresIn: Date;
}

export const RefreshSchema = SchemaFactory.createForClass(RefreshToken);
export type RefreshDocument = HydratedDocument<RefreshToken>