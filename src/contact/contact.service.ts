import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service';
import { ContactDto } from './dto/contact.dto';

@Injectable()
export class ContactService {
  constructor(
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async submit(dto: ContactDto): Promise<void> {
    const fromEmail = this.configService.get<string>(
      'SMTP_FROM',
      this.configService.get<string>('SMTP_USER', ''),
    );

    if (!fromEmail) {
      throw new ServiceUnavailableException(
        'El envío de correo no está configurado en el servidor.',
      );
    }

    const inbox = this.configService.get<string>(
      'CONTACT_INBOX_EMAIL',
      'rosario.entradas.ok@gmail.com',
    );

    await this.emailService.sendContactNotification(inbox, {
      name: dto.name,
      email: dto.email,
      message: dto.message,
      subject: dto.subject,
    });
  }
}
