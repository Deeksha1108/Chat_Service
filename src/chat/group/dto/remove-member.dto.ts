import { ApiProperty } from '@nestjs/swagger';
import { IsMongoId, IsNotEmpty } from 'class-validator';

export class RemoveMemberDto {
  @ApiProperty({
    description: 'The ID of the group from which the member will be removed',
    example: '665c7c1f9a2a3a7e9cf182aa',
  })
  @IsNotEmpty()
  @IsMongoId()
  groupId: string;

  @ApiProperty({
    description: 'The ID of the member to be removed from the group',
    example: '665c7c1f9a2a3a7e9cf177cc',
  })
  @IsNotEmpty()
  memberIdToRemove: string;
}
