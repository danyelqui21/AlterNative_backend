import { IsUUID, IsArray, IsNotEmpty } from 'class-validator';

export class ShareEventDto {
  @IsUUID()
  @IsNotEmpty()
  eventId: string;

  @IsArray()
  @IsUUID('4', { each: true })
  clanIds: string[];
}
