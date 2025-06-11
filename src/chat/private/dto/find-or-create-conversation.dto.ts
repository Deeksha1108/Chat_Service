import { IsMongoId, IsNotEmpty } from 'class-validator';

export class FindOrCreateConversationDto {
  // @IsMongoId()
  // @IsNotEmpty()
  // user1: string;

  @IsMongoId()
  @IsNotEmpty()
  user2: string;
}
