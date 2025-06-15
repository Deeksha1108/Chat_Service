import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class SendGroupMessageDto {
  @ApiProperty({
    description: 'The ID of the group where the message is being sent',
    example: '665c7c1f9a2a3a7e9cf182aa',
  })
  @IsNotEmpty()
  @IsMongoId()
  groupId: string;

  @ApiProperty({
    description: 'The content of the message being sent to the group',
    example: 'Hey team, lets connect at 5PM.',
  })
  @IsNotEmpty()
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: 'Array of user IDs who are tagged in the message',
    example: ['665c7c1f9a2a3a7e9cf184bd', '665c7c1f9a2a3a7e9cf184be'],
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsMongoId()
  taggedUserIds?: string[];
}
