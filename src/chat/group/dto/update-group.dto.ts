import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class UpdateGroupDto {
  @ApiProperty({
    description: 'The ID of the group to be updated',
    example: '665c7c1f9a2a3a7e9cf182aa',
  })
  @IsNotEmpty()
  groupId: string;

  @ApiProperty({
    description: 'The new name for the group',
    example: 'Project Phoenix',
  })
  @IsString()
  @IsNotEmpty()
  newName: string;
}
