import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty, IsString } from 'class-validator';

export class MessageDto {
  @ApiProperty({
    description: 'ID of the user sending the message',
    example: '665fbc42a3870c297cf0f9b5',
  })
  @IsMongoId()
  @IsNotEmpty()
  senderId: string;

  @ApiProperty({
    description: 'ID of the user receiving the message',
    example: '665fbc42a3870c297cf0f9b6',
  })
  @IsMongoId()
  @IsNotEmpty()
  receiverId: string;

  @ApiProperty({
    description: 'ID of the chat room where the message is being sent',
    example: '665fcafca3870c297cf0faa1',
  })
  @IsMongoId()
  @IsNotEmpty()
  roomId: string;

  @ApiProperty({
    description: 'Actual message content to be sent',
    example: 'Hello, how are you?',
  })
  @IsNotEmpty()
  content: string;
}
