import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';

export class LeaveGroupDto {
  @ApiProperty({
    description: 'The ID of the group the user wants to leave',
    example: '665c7c1f9a2a3a7e9cf182aa',
  })
  @IsNotEmpty()
  @IsMongoId()
  groupId: string;
}
