import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsString,
  IsArray,
  ArrayMinSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsOptional,
} from 'class-validator';

export class CreateGroupDto {
  @ApiProperty({
    description: 'Name of the group to be created',
    example: 'Team Alpha',
  })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiPropertyOptional({
    description: 'Optional description of the group',
    example: 'A group for backend developers',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'List of member user IDs (must include at least 2 unique IDs)',
    example: ['665c7c1f9a2a3a7e9cf182aa', '665c7c8f9a2a3a7e9cf182bc'],
    type: [String],
    minItems: 2,
    uniqueItems: true,
  })
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsArray()
  @ArrayMinSize(2)
  members: string[];
}
