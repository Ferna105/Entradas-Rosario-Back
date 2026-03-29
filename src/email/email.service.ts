import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Ticket } from '../entities/ticket.entity';
import { Event } from '../entities/event.entity';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: this.configService.get<string>('SMTP_USER', ''),
        pass: this.configService.get<string>('SMTP_PASS', ''),
      },
    });
  }

  /** Primera URL de BASE_URL_FRONT (o CORS_ORIGINS), sin barra final; para enlaces en emails. */
  private getFrontendBaseUrl(): string {
    const raw =
      this.configService.get<string>('BASE_URL_FRONT', '') ||
      this.configService.get<string>('CORS_ORIGINS', '');
    const first = raw
      .split(',')
      .map((s) => s.trim().replace(/\/+$/, ''))
      .find(Boolean);
    return first ?? '';
  }

  async sendTicketEmail(
    buyerEmail: string,
    buyerName: string,
    event: Event,
    tickets: Ticket[],
    ticketTypeName?: string,
  ): Promise<void> {
    const fromEmail = this.configService.get<string>('SMTP_FROM', this.configService.get<string>('SMTP_USER', ''));

    if (!fromEmail) {
      console.warn('SMTP no configurado, tickets generados pero email no enviado');
      return;
    }

    const eventDate = new Date(event.event_date).toLocaleDateString('es-AR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const ticketsHtml = tickets
      .map(
        (ticket, index) => `
        <div style="border: 2px solid #e2e8f0; border-radius: 12px; padding: 24px; margin: 16px 0; background: #ffffff; text-align: center;">
          <p style="color: #64748b; font-size: 14px; margin: 0 0 8px 0;">Entrada ${index + 1} de ${tickets.length}</p>
          <img src="cid:qr_${ticket.id}" alt="QR Code" style="width: 250px; height: 250px; margin: 16px auto; display: block;" />
          <p style="font-family: monospace; font-size: 12px; color: #94a3b8; margin: 8px 0 0 0;">${ticket.qr_data}</p>
        </div>`,
      )
      .join('');

    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; margin: 0; padding: 32px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">🎶 Entradas Rosario</h1>
          <p style="color: #e0e7ff; margin: 8px 0 0 0;">Tu entrada está confirmada</p>
        </div>

        <div style="padding: 32px;">
          <p style="color: #334155; font-size: 16px;">Hola <strong>${buyerName}</strong>,</p>
          <p style="color: #64748b; font-size: 15px;">¡Tu compra fue confirmada! Acá tenés ${tickets.length > 1 ? 'tus entradas' : 'tu entrada'} para:</p>
          
          <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #6366f1;">
            <h2 style="color: #1e293b; margin: 0 0 8px 0; font-size: 20px;">${event.name}</h2>
            ${ticketTypeName ? `<p style="color: #64748b; margin: 4px 0;">🎫 ${ticketTypeName}</p>` : ''}
            <p style="color: #64748b; margin: 4px 0;">📅 ${eventDate}</p>
            <p style="color: #64748b; margin: 4px 0;">📍 ${event.location || 'Lugar a confirmar'}</p>
          </div>

          <h3 style="color: #334155; text-align: center; margin: 28px 0 12px 0;">
            ${tickets.length > 1 ? `Tus ${tickets.length} entradas` : 'Tu entrada'}
          </h3>

          ${ticketsHtml}

          <div style="background: #fef3c7; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="color: #92400e; font-size: 14px; margin: 0;">
              <strong>⚠️ Importante:</strong> Presentá ${tickets.length > 1 ? 'estos códigos QR' : 'este código QR'} en la entrada del evento. 
              Cada QR es de uso único y será escaneado al ingresar.
            </p>
          </div>
        </div>

        <div style="background: #f1f5f9; padding: 20px; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">Entradas Rosario - Plataforma de venta de entradas</p>
        </div>
      </div>
    </body>
    </html>`;

    const attachments = tickets.map((ticket) => {
      const base64Data = ticket.qr_code?.replace(/^data:image\/png;base64,/, '') || '';
      return {
        filename: `qr_entrada_${ticket.id}.png`,
        content: Buffer.from(base64Data, 'base64'),
        cid: `qr_${ticket.id}`,
      };
    });

    try {
      await this.transporter.sendMail({
        from: `"Entradas Rosario" <${fromEmail}>`,
        to: buyerEmail,
        subject: `🎶 Tu entrada para ${event.name}`,
        html,
        attachments,
      });

      console.log(`Email enviado a ${buyerEmail} con ${tickets.length} entrada(s)`);
    } catch (error) {
      console.error(`Error enviando email a ${buyerEmail}:`, error);
    }
  }

  async sendScannerInvitationEmail(
    toEmail: string,
    eventName: string,
    organizerName: string,
    rawToken: string,
  ): Promise<void> {
    const fromEmail = this.configService.get<string>(
      'SMTP_FROM',
      this.configService.get<string>('SMTP_USER', ''),
    );

    const frontendUrl = this.getFrontendBaseUrl();
    const acceptPath = `/escaneador/aceptar?token=${encodeURIComponent(rawToken)}`;
    const link = frontendUrl ? `${frontendUrl}${acceptPath}` : acceptPath;

    if (!fromEmail) {
      console.warn('SMTP no configurado, invitación de escaneador no enviada por email');
      return;
    }

    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f1f5f9; margin: 0; padding: 32px;">
      <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="background: linear-gradient(135deg, #6366f1, #8b5cf6); padding: 32px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Entradas Rosario</h1>
          <p style="color: #e0e7ff; margin: 8px 0 0 0;">Invitación como escaneador</p>
        </div>
        <div style="padding: 32px;">
          <p style="color: #334155; font-size: 16px;">Hola,</p>
          <p style="color: #64748b; font-size: 15px;">
            <strong>${organizerName}</strong> te invitó a escanear entradas QR en el evento:
          </p>
          <div style="background: #f8fafc; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid #6366f1;">
            <h2 style="color: #1e293b; margin: 0; font-size: 20px;">${eventName}</h2>
          </div>
          <p style="color: #64748b; font-size: 15px;">Para aceptar y crear tu cuenta de escaneador, hacé clic en el botón:</p>
          <div style="text-align: center; margin: 28px 0;">
            <a href="${link}" style="display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 600; font-size: 15px;">Aceptar invitación</a>
          </div>
          <p style="color: #94a3b8; font-size: 12px; word-break: break-all;">Si el botón no funciona, copiá este enlace en el navegador:<br/>${link}</p>
        </div>
        <div style="background: #f1f5f9; padding: 20px; text-align: center;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">Entradas Rosario</p>
        </div>
      </div>
    </body>
    </html>`;

    try {
      await this.transporter.sendMail({
        from: `"Entradas Rosario" <${fromEmail}>`,
        to: toEmail,
        subject: `Invitación para escanear: ${eventName}`,
        html,
      });
      console.log(`Invitación de escaneador enviada a ${toEmail}`);
    } catch (error) {
      console.error(`Error enviando invitación de escaneador a ${toEmail}:`, error);
    }
  }
}
