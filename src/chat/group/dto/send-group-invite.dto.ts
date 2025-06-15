import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty } from 'class-validator';

export class SendGroupInviteDto {
  @ApiProperty({
    description: 'The ID of the group sending the invite',
    example: '665c7c1f9a2a3a7e9cf182aa',
  })
  @IsNotEmpty()
  groupId: string;

  @ApiProperty({
    description: 'The ID of the user being invited',
    example: '665c7c1f9a2a3a7e9cf182bd',
  })
  @IsNotEmpty()
  invitedUserId: string;
}
