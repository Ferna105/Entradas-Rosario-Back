import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class AcceptScannerInvitationDto {
  @IsNotEmpty({ message: 'El token es obligatorio' })
  @IsString()
  token: string;

  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @IsString()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name: string;

  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  @IsString()
  @MinLength(6, { message: 'La contraseña debe tener al menos 6 caracteres' })
  password: string;
}
