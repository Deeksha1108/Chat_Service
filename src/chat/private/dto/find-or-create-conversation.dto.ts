import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class FindOrCreateConversationDto {
  @ApiProperty({
    description: 'User ID of the second participant in the conversation',
    example: '665a5e9e23f04b1cd9a50a87',
  })
  @IsMongoId()
  @IsNotEmpty()
  user2: string;
}
