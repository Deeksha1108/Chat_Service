import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({ type: Types.ObjectId, ref: 'Conversation', required: true })
  roomId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sender: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  receiver: Types.ObjectId;

  @Prop({ type: String, required: true })
  content: string;

  @Prop({ default: false })
  delivered: boolean;

  @Prop({ default: false })
  read: boolean;

  @Prop({ type: String, enum: ['sent', 'delivered', 'seen'], default: 'sent' })
  status: string;

  @Prop({ type: Date })
  deliveredAt: Date;

  @Prop({ type: Date })
  seenAt: Date;

  @Prop({ type: Boolean, default: false })
  edited: boolean;

  @Prop({ type: Date })
  editedAt?: Date;

  @Prop({ type: Boolean, default: false })
  deleted: boolean;

  @Prop({ type: Date })
  deletedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
MessageSchema.index({ roomId: 1, createdAt: 1 });
MessageSchema.index({ receiver: 1, read: 1 });
