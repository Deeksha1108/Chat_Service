import { IsArray, ArrayNotEmpty, IsMongoId } from 'class-validator';

export class BulkMarkDeliveredDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsMongoId({ each: true })
  messageIds: string[];
}
