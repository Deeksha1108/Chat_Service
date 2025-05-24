import { IsMongoId, IsString } from 'class-validator';

export class SendGroupMessageDto {
  @IsMongoId()
  groupId: string;

  @IsMongoId()
  senderId: string;

  @IsString()
  content: string;
}
