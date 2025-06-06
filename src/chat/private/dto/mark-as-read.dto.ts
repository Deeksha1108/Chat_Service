import { IsMongoId, IsNotEmpty } from 'class-validator';

export class MarkAsReadDto {
  @IsMongoId()
  @IsNotEmpty()
  messageId: string;
}
