import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GroupMessageDocument = GroupMessage & Document;

@Schema({ timestamps: true })
export class GroupMessage {
  @Prop({ type: Types.ObjectId, ref: 'Group', required: true })
  groupId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  taggedUserIds?: Types.ObjectId[];
}

export const GroupMessageSchema = SchemaFactory.createForClass(GroupMessage);
