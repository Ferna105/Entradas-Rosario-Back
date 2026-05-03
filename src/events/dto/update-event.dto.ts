import {
  IsOptional,
  IsDateString,
  IsUrl,
  IsEnum,
  IsBoolean,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { EventCategory, EventStatus } from '../../entities/event.entity';
import { TicketTypeItemDto } from './ticket-type-item.dto';

export class UpdateEventDto {
  @IsOptional()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  description?: string;

  @IsOptional()
  @MaxLength(255)
  location?: string;

  @IsOptional()
  @IsDateString({}, { message: 'La fecha del evento no es válida' })
  event_date?: string;

  @IsOptional()
  @IsUrl({}, { message: 'La URL de la imagen no es válida' })
  image?: string;

  @IsOptional()
  @IsEnum(EventStatus, { message: 'Estado inválido' })
  status?: EventStatus;

  @IsOptional()
  @IsEnum(EventCategory, { message: 'Categoría inválida' })
  category?: EventCategory;

  @IsOptional()
  @IsBoolean()
  show_attendees?: boolean;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => TicketTypeItemDto)
  @ArrayMinSize(1, { message: 'Debe haber al menos un tipo de entrada' })
  ticketTypes?: TicketTypeItemDto[];
}
