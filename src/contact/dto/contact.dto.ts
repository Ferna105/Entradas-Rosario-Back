import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ContactDto {
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString()
  @MaxLength(120, { message: 'El nombre es demasiado largo' })
  name: string;

  @IsEmail({}, { message: 'El email no es válido' })
  email: string;

  @IsNotEmpty({ message: 'El mensaje es obligatorio' })
  @IsString()
  @MinLength(10, { message: 'El mensaje debe tener al menos 10 caracteres' })
  @MaxLength(5000, { message: 'El mensaje es demasiado largo' })
  message: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'El asunto es demasiado largo' })
  subject?: string;
}
