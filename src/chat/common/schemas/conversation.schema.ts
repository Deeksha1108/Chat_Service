import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, SchemaTypes, Types } from 'mongoose';

export type ConversationDocument = Conversation & Document;

@Schema({ timestamps: true })
export class Conversation {
  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  createdBy: string;

  @Prop({
    type: [{ type: SchemaTypes.ObjectId, ref: 'User' }],
    required: true,
  })
  participants: string[];

  @Prop({ default: false })
  isGroup: boolean;

  @Prop()
  groupName?: string;

  @Prop({ type: SchemaTypes.ObjectId, ref: 'User' })
  groupAdmin?: string;

  @Prop({ type: [Types.ObjectId], ref: 'Message', default: [] })
  messages: Types.ObjectId[];
}

export const ConversationSchema = SchemaFactory.createForClass(Conversation);
