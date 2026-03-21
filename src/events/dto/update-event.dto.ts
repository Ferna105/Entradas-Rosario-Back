import {
  IsOptional,
  IsNumber,
  IsDateString,
  IsUrl,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import { EventStatus } from '../../entities/event.entity';

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
  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0)
  price?: number;

  @IsOptional()
  @IsNumber({}, { message: 'La capacidad debe ser un número' })
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsUrl({}, { message: 'La URL de la imagen no es válida' })
  image?: string;

  @IsOptional()
  @IsEnum(EventStatus, { message: 'Estado inválido' })
  status?: EventStatus;
}
