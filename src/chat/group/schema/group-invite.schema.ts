import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema()
export class GroupInvite {
  @Prop({ type: Types.ObjectId, ref: 'Group', required: true })
  groupId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  invitedUserId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  invitedBy: Types.ObjectId;

  @Prop({
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending',
    required: true,
    index: true,
  })
  status: string;

  @Prop({ default: Date.now })
  sentAt: Date;

  @Prop()
  respondedAt?: Date;
}

export type GroupInviteDocument = GroupInvite & Document;
export const GroupInviteSchema = SchemaFactory.createForClass(GroupInvite);

GroupInviteSchema.pre('findOneAndUpdate', async function (next) {
  const update = this.getUpdate() as Record<string, any>;
  const status = update?.status ?? (update.$set && update.$set.status);

  if (!status) return next();
  const validTransitions = {
    pending: ['accepted', 'declined'],
    accepted: [],
    declined: [],
  };

  const doc = await this.model.findOne(this.getQuery());
  if (!doc) return next();

  if (!validTransitions[doc.status].includes(update.status)) {
    return next(
      new Error(
        `Invalid status transition from ${doc.status} to ${update.status}`,
      ),
    );
  }
  next();
});
