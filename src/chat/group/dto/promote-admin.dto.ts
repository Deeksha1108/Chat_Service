import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class PromoteToAdminDto {
  @ApiProperty({
    description: 'The ID of the group',
    example: '665c7c1f9a2a3a7e9cf182aa',
  })
  @IsNotEmpty()
  groupId: string;

  @ApiProperty({
    description: 'The ID of the user who is promoting',
    example: '665c7c1f9a2a3a7e9cf188bb',
  })
  @IsNotEmpty()
  promotedBy: string;

  @ApiProperty({
    description: 'The ID of the member being promoted to admin',
    example: '665c7c1f9a2a3a7e9cf177cc',
  })
  @IsNotEmpty()
  memberIdToPromote: string;
}
