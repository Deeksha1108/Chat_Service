import { IsMongoId, IsNotEmpty, IsString } from "class-validator";

export class EditMessageDto {
  @IsMongoId()
  messageId: string;

  @IsString()
  @IsNotEmpty()
  newContent: string;
}
