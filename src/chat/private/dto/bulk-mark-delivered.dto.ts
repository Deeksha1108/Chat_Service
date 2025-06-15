import { ApiProperty } from '@nestjs/swagger';
import { IsArray, ArrayNotEmpty, IsString, IsMongoId } from 'class-validator';

export class BulkMarkDeliveredDto {
  @ApiProperty({
    description: 'List of message IDs to mark as delivered',
    example: ['64fc10dbd1f39c3788659cc8', '64fc10dbd1f39c3788659cc9'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  @IsString()
  messageIds: string[];
}
