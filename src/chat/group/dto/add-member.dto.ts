import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';

export class AddMemberDto {
  @ApiProperty({
    description: 'The ID of the group where the member will be added',
    example: '665c7c8f9a2a3a7e9cf182bc',
  })
  @IsNotEmpty()
  @IsMongoId()
  groupId: string;

  @ApiProperty({
    description: 'The ID of the new member to add to the group',
    example: '665c7c1f9a2a3a7e9cf182aa',
  })
  @IsNotEmpty()
  @IsMongoId()
  newMemberId: string;
}
