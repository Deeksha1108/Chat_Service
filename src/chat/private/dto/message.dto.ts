import { IsNotEmpty, IsString, IsMongoId } from 'class-validator';

export class MessageDto {
  @IsMongoId()
  @IsNotEmpty()
  senderId: string;

  @IsMongoId()
  @IsNotEmpty()
  receiverId: string;

  @IsMongoId()
  @IsNotEmpty()
  roomId: string;

  @IsString()
  @IsNotEmpty()
  content: string;
}
