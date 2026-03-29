import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class TicketTypeItemDto {
  @IsOptional()
  @IsInt()
  id?: number;

  @IsNotEmpty({ message: 'El nombre del tipo de entrada es obligatorio' })
  @IsString()
  @MaxLength(120)
  name: string;

  @IsNumber({}, { message: 'El precio debe ser un número' })
  @Min(0, { message: 'El precio no puede ser negativo' })
  price: number;

  @IsNumber({}, { message: 'La capacidad debe ser un número' })
  @Min(1, { message: 'La capacidad debe ser al menos 1' })
  capacity: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}
