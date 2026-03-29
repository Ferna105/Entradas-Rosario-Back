import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { createHash, randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { EventScanner } from '../entities/event-scanner.entity';
import {
  ScannerInvitation,
  ScannerInvitationStatus,
} from '../entities/scanner-invitation.entity';
import { User, UserType } from '../entities/user.entity';
import { TicketsService } from '../tickets/tickets.service';
import { UsersService } from '../users/users.service';
import { EventsService } from '../events/events.service';
import { EmailService } from '../email/email.service';

const SALT_ROUNDS = 10;
const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const vis = local.slice(0, 2);
  return `${vis}***@${domain}`;
}

@Injectable()
export class ScannerService {
  constructor(
    @InjectRepository(EventScanner)
    private eventScannerRepository: Repository<EventScanner>,
    @InjectRepository(ScannerInvitation)
    private invitationRepository: Repository<ScannerInvitation>,
    private ticketsService: TicketsService,
    private usersService: UsersService,
    private eventsService: EventsService,
    private emailService: EmailService,
  ) {}

  private async assertSellerOwnsEvent(
    eventId: number,
    userId: number,
    requesterType: UserType,
  ): Promise<void> {
    if (requesterType === UserType.ADMIN) {
      await this.eventsService.getEventById(eventId);
      return;
    }
    const event = await this.eventsService.getEventById(eventId);
    if (event.seller_id !== userId) {
      throw new ForbiddenException('No tenés permisos para este evento');
    }
  }

  async inviteScanner(
    eventId: number,
    scannerEmailRaw: string,
    assignerId: number,
    assignerType: UserType,
  ) {
    await this.assertSellerOwnsEvent(eventId, assignerId, assignerType);
    const scannerEmail = normalizeEmail(scannerEmailRaw);

    const existingUser = await this.usersService.findByEmail(scannerEmail);
    if (existingUser) {
      if (existingUser.type !== UserType.SCANNER) {
        throw new BadRequestException(
          'Ese email ya está registrado con otra cuenta. Los escaneadores deben usar un email que no exista en el sistema.',
        );
      }
      const dup = await this.eventScannerRepository.findOne({
        where: { event_id: eventId, scanner_id: existingUser.id },
      });
      if (dup) {
        throw new ConflictException('Ese escaneador ya está asignado a este evento');
      }
      const assignment = this.eventScannerRepository.create({
        event_id: eventId,
        scanner_id: existingUser.id,
      });
      await this.eventScannerRepository.save(assignment);
      return {
        kind: 'assigned' as const,
        message: `Escaneador ${existingUser.name} asignado al evento`,
        scanner: {
          id: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
        },
      };
    }

    let invitation = await this.invitationRepository.findOne({
      where: { event_id: eventId, email: scannerEmail },
    });

    const event = await this.eventsService.getEventById(eventId);
    const assigner = await this.usersService.findById(assignerId);
    const assignerName = assigner?.name ?? 'El organizador';

    if (invitation) {
      if (invitation.status === ScannerInvitationStatus.ACCEPTED) {
        throw new ConflictException(
          'Esta invitación ya fue aceptada. Si el escaneador no figura en la lista, contactá soporte.',
        );
      }
    }

    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

    if (!invitation) {
      invitation = this.invitationRepository.create({
        event_id: eventId,
        email: scannerEmail,
        token_hash: tokenHash,
        status: ScannerInvitationStatus.PENDING,
        expires_at: expiresAt,
        invited_by_user_id: assignerId,
      });
    } else {
      invitation.token_hash = tokenHash;
      invitation.status = ScannerInvitationStatus.PENDING;
      invitation.expires_at = expiresAt;
      invitation.invited_by_user_id = assignerId;
    }

    await this.invitationRepository.save(invitation);

    await this.emailService.sendScannerInvitationEmail(
      scannerEmail,
      event.name,
      assignerName,
      rawToken,
    );

    return {
      kind: 'invited' as const,
      message: 'Se envió un correo con el enlace para completar el registro como escaneador',
      invitationId: invitation.id,
    };
  }

  async validateInvitationToken(token: string) {
    if (!token?.trim()) {
      throw new BadRequestException('Token inválido');
    }
    const tokenHash = hashToken(token.trim());
    const invitation = await this.invitationRepository.findOne({
      where: { token_hash: tokenHash },
      relations: ['event', 'invited_by'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada o el enlace expiró');
    }

    if (invitation.status !== ScannerInvitationStatus.PENDING) {
      throw new BadRequestException('Esta invitación ya no es válida');
    }

    if (new Date() > invitation.expires_at) {
      throw new BadRequestException(
        'Esta invitación expiró. Pedí al organizador que reenvíe la invitación.',
      );
    }

    const ev = invitation.event;
    return {
      eventName: ev.name,
      eventDate: ev.event_date,
      location: ev.location,
      organizerName: invitation.invited_by?.name ?? 'Organizador',
      emailMasked: maskEmail(invitation.email),
    };
  }

  async acceptInvitation(token: string, name: string, password: string) {
    const tokenHash = hashToken(token.trim());
    const invitation = await this.invitationRepository.findOne({
      where: { token_hash: tokenHash },
      relations: ['event'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada o el enlace expiró');
    }

    if (invitation.status !== ScannerInvitationStatus.PENDING) {
      throw new BadRequestException('Esta invitación ya no es válida');
    }

    if (new Date() > invitation.expires_at) {
      invitation.status = ScannerInvitationStatus.EXPIRED;
      await this.invitationRepository.save(invitation);
      throw new BadRequestException('Esta invitación expiró');
    }

    const email = invitation.email;
    const existing = await this.usersService.findByEmail(email);
    if (existing) {
      throw new ConflictException(
        'Ese email ya está registrado. No se puede completar esta invitación.',
      );
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const eventName = invitation.event?.name;

    await this.invitationRepository.manager.transaction(async (manager) => {
      const userRepo = manager.getRepository(User);
      const esRepo = manager.getRepository(EventScanner);

      const user = userRepo.create({
        name: name.trim(),
        email,
        password_hash: passwordHash,
        type: UserType.SCANNER,
      });
      const savedUser = await manager.save(user);

      const link = esRepo.create({
        event_id: invitation.event_id,
        scanner_id: savedUser.id,
      });
      await manager.save(link);

      await manager.update(ScannerInvitation, invitation.id, {
        status: ScannerInvitationStatus.ACCEPTED,
        accepted_at: new Date(),
      });
    });

    return {
      message: 'Cuenta de escaneador creada y vinculada al evento',
      eventName,
    };
  }

  async resendInvitation(
    invitationId: number,
    sellerId: number,
    requesterType: UserType,
  ) {
    const invitation = await this.invitationRepository.findOne({
      where: { id: invitationId },
      relations: ['event', 'invited_by'],
    });

    if (!invitation) {
      throw new NotFoundException('Invitación no encontrada');
    }

    await this.assertSellerOwnsEvent(invitation.event_id, sellerId, requesterType);

    if (invitation.status !== ScannerInvitationStatus.PENDING) {
      throw new BadRequestException('Solo se pueden reenviar invitaciones pendientes');
    }

    const rawToken = randomBytes(32).toString('hex');
    invitation.token_hash = hashToken(rawToken);
    invitation.expires_at = new Date(Date.now() + INVITATION_TTL_MS);
    await this.invitationRepository.save(invitation);

    const event = invitation.event;
    const assignerName = invitation.invited_by?.name ?? 'El organizador';

    await this.emailService.sendScannerInvitationEmail(
      invitation.email,
      event.name,
      assignerName,
      rawToken,
    );

    return { message: 'Invitación reenviada por correo' };
  }

  async getPendingInvitations(
    eventId: number,
    sellerId: number,
    requesterType: UserType,
  ) {
    await this.assertSellerOwnsEvent(eventId, sellerId, requesterType);
    const rows = await this.invitationRepository.find({
      where: {
        event_id: eventId,
        status: ScannerInvitationStatus.PENDING,
      },
      order: { created_at: 'DESC' },
    });

    return rows.map((r) => ({
      id: r.id,
      email: r.email,
      created_at: r.created_at,
      expires_at: r.expires_at,
    }));
  }

  async removeScanner(
    eventId: number,
    scannerId: number,
    sellerId: number,
    requesterType: UserType,
  ) {
    await this.assertSellerOwnsEvent(eventId, sellerId, requesterType);

    const assignment = await this.eventScannerRepository.findOne({
      where: { event_id: eventId, scanner_id: scannerId },
    });
    if (!assignment) {
      throw new NotFoundException('Asignación no encontrada');
    }

    await this.eventScannerRepository.remove(assignment);
    return { message: 'Escaneador removido del evento' };
  }

  async getScannersByEvent(
    eventId: number,
    sellerId: number,
    requesterType: UserType,
  ) {
    await this.assertSellerOwnsEvent(eventId, sellerId, requesterType);

    const assignments = await this.eventScannerRepository.find({
      where: { event_id: eventId },
      relations: ['scanner'],
    });

    return assignments.map((a) => ({
      id: a.scanner.id,
      name: a.scanner.name,
      email: a.scanner.email,
      assigned_at: a.assigned_at,
    }));
  }

  async getEventsForScanner(scannerId: number) {
    const assignments = await this.eventScannerRepository.find({
      where: { scanner_id: scannerId },
      relations: ['event'],
    });

    return assignments.map((a) => a.event);
  }

  async scanTicket(qrData: string, scannerId: number, eventId: number) {
    const isAssigned = await this.eventScannerRepository.findOne({
      where: { event_id: eventId, scanner_id: scannerId },
    });

    if (!isAssigned) {
      throw new ForbiddenException('No tenés permiso para escanear en este evento');
    }

    const ticket = await this.ticketsService.getTicketByQrData(qrData);

    if (!ticket) {
      return {
        valid: false,
        message: 'Entrada no encontrada - QR inválido',
      };
    }

    if (ticket.event_id !== eventId) {
      return {
        valid: false,
        message: 'Esta entrada no corresponde a este evento',
        ticket: {
          id: ticket.id,
          eventName: ticket.event?.name,
        },
      };
    }

    const result = await this.ticketsService.validateTicket(qrData, scannerId);

    if (result.valid && result.ticket) {
      return {
        valid: true,
        message: result.message,
        ticket: {
          id: result.ticket.id,
          buyerName: result.ticket.purchase?.buyer_name,
          buyerEmail: result.ticket.purchase?.buyer_email,
          eventName: result.ticket.event?.name,
        },
      };
    }

    return {
      valid: false,
      message: result.message,
      ticket: result.ticket
        ? {
            id: result.ticket.id,
            buyerName: result.ticket.purchase?.buyer_name,
            eventName: result.ticket.event?.name,
          }
        : undefined,
    };
  }

  async getEventStats(eventId: number, scannerId: number) {
    const isAssigned = await this.eventScannerRepository.findOne({
      where: { event_id: eventId, scanner_id: scannerId },
    });

    if (!isAssigned) {
      throw new ForbiddenException('No tenés permiso para ver este evento');
    }

    const tickets = await this.ticketsService.getTicketsByEvent(eventId);

    return {
      total: tickets.length,
      scanned: tickets.filter((t) => t.status === 'used').length,
      valid: tickets.filter((t) => t.status === 'valid').length,
      cancelled: tickets.filter((t) => t.status === 'cancelled').length,
    };
  }
}
