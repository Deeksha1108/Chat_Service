import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GroupDocument = Group & Document;

@Schema({ _id: false })
export class GroupMember {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId: Types.ObjectId;

  @Prop({ enum: ['admin', 'member'], default: 'member' })
  role: 'admin' | 'member';

  @Prop({ default: Date.now })
  joinedAt: Date;

  @Prop({ default: false })
  isRemoved: boolean;
}

const GroupMemberSchema = SchemaFactory.createForClass(GroupMember);

@Schema({ timestamps: true })
export class Group {
  @Prop({ required: true, trim: true })
  name: string;

  @Prop({ type: String, trim: true, default: '' })
  description?: string;

  @Prop({ type: [GroupMemberSchema], default: [] })
  members: GroupMember[];

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  createdBy: Types.ObjectId;

  @Prop({ default: false })
  isDeleted: boolean;
}

export const GroupSchema = SchemaFactory.createForClass(Group);

GroupSchema.index({ name: 'text' });
GroupSchema.index({ name: 1, createdBy: 1 }, { unique: true });

GroupSchema.pre('save', function (next) {
  const memberIds = new Set();
  for (const member of this.members) {
    const idStr = member.userId.toString();
    if (memberIds.has(idStr)) {
      return next(new Error(`Duplicate member found: ${idStr}`));
    }
    memberIds.add(idStr);
  }
  next();
});
