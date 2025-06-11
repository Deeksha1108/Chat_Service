import { IsMongoId } from 'class-validator';

export class DeleteMessageDto {
  @IsMongoId({ message: 'Invalid messageId' })
  messageId: string;
}
