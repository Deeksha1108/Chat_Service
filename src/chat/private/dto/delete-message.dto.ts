import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsString } from 'class-validator';

export class DeleteMessageDto {
  @ApiProperty({
    description: 'ID of the message to be deleted',
    example: '64fc10dbd1f39c3788659cc8',
  })
  @IsMongoId()
  messageId: string;
}
