import { IsArray, IsMongoId, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class SendGroupMessageDto {
  @IsNotEmpty()
  @IsMongoId()
  groupId: string;

  @IsNotEmpty()
  @IsMongoId()
  senderId: string;

  @IsNotEmpty()
  @IsString()
  content: string;

  @IsOptional()
  @IsArray()
  @IsMongoId({ each: true })
  taggedUserIds?: string[];
}
