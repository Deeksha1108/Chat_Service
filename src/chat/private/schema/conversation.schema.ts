import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Conversation extends Document {
  @Prop({
    type: [{ type: Types.ObjectId, ref: 'User' }],
    required: true,
    validate: (val: Types.ObjectId[]) => val.length === 2,
  })
  participants: Types.ObjectId[];
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);

ConversationSchema.pre('save', function (next) {
  this.participants.sort();
  next();
});

ConversationSchema.index(
  { 'participants.0': 1, 'participants.1': 1 },
  { unique: true },
);

export type ConversationDocument = Conversation & Document;
