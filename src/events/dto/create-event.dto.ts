import {
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsDateString,
  IsUrl,
  Min,
  MaxLength,
} from 'class-validator';

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

  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  price: number;

  @IsNumber({}, { message: 'La capacidad debe ser un número' })
  @Min(1, { message: 'La capacidad debe ser al menos 1' })
  capacity: number;

  @IsOptional()
  @IsUrl({}, { message: 'La URL de la imagen no es válida' })
  image?: string;
}
