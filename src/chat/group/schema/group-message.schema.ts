import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GroupMessageDocument = GroupMessage & Document;

@Schema({ timestamps: true })
export class GroupMessage {
  @Prop({ type: Types.ObjectId, ref: 'Group', required: true })
  groupId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ type: Boolean, default: false })
  isEdited: boolean;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'GroupMessage' })
  repliedTo?: Types.ObjectId;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], default: [] })
  taggedUserIds?: Types.ObjectId[];
}

export const GroupMessageSchema = SchemaFactory.createForClass(GroupMessage);

GroupMessageSchema.index({ groupId: 1, createdAt: -1 });
GroupMessageSchema.index({ senderId: 1, groupId: 1 });

GroupMessageSchema.pre('save', function (next) {
  if (this.isModified('content') && !this.isNew) {
    this.isEdited = true;
  }
  next();
});
