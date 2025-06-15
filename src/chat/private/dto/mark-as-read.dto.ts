import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';

export class MarkAsReadDto {
  @ApiProperty({
    description: 'ID of the message to mark as read',
    example: '665fbc42a3870c297cf0f9b5',
  })
  @IsMongoId()
  @IsNotEmpty()
  messageId: string;
}
