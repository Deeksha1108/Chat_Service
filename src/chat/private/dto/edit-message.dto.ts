import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class EditMessageDto {
  @ApiProperty({
    description: 'ID of the message to be edited',
    example: '64fc10dbd1f39c3788659cc8',
  })
  @IsMongoId()
  messageId: string;

  @ApiProperty({
    description: 'New content to replace the old message content',
    example: 'Hey, I updated the message!',
  })
  @IsString()
  @IsNotEmpty()
  newContent: string;
}
