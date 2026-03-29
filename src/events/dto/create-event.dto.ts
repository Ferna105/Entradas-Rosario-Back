import {
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsUrl,
  MaxLength,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TicketTypeItemDto } from './ticket-type-item.dto';

export class CreateEventDto {
  @IsNotEmpty({ message: 'El nombre del evento es obligatorio' })
  @MaxLength(200)
  name: string;

  @IsOptional()
  description?: string;

  @IsOptional()
  @MaxLength(255)
  location?: string;

  @IsDateString({}, { message: 'La fecha del evento no es válida' })
  event_date: string;

  @IsOptional()
  @IsUrl({}, { message: 'La URL de la imagen no es válida' })
  image?: string;

  @ValidateNested({ each: true })
  @Type(() => TicketTypeItemDto)
  @ArrayMinSize(1, { message: 'Debe haber al menos un tipo de entrada' })
  ticketTypes: TicketTypeItemDto[];
}
