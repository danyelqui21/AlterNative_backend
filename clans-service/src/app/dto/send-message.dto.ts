import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ClanMessageType } from '../entities/clan-message.entity';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsEnum(ClanMessageType)
  @IsOptional()
  type?: ClanMessageType;

  @IsUUID()
  @IsOptional()
  eventId?: string;
}
