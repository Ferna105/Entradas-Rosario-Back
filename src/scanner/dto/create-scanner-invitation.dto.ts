import { IsEmail, IsInt, IsNotEmpty, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateScannerInvitationDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  eventId: number;

  @IsNotEmpty({ message: 'El email es obligatorio' })
  @IsEmail({}, { message: 'El email no es válido' })
  scannerEmail: string;
}
