import { ArrayMinSize, IsMongoId, IsString, MinLength } from 'class-validator';

export class CreateGroupChatDto {
  @IsString()
  @MinLength(3)
  name: string;

  @ArrayMinSize(2)
  @IsMongoId({ each: true })
  participants: string[];

  @IsMongoId()
  adminId: string;
}
