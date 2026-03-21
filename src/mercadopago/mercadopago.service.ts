import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
  user_id: number;
  refresh_token: string;
  public_key: string;
}

@Injectable()
export class MercadoPagoService {
  private appId: string;
  private clientSecret: string;

  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    this.appId = this.configService.get<string>('MP_APP_ID', '');
    this.clientSecret = this.configService.get<string>('MP_CLIENT_SECRET', '');
  }

  /** Debe coincidir byte a byte con la Redirect URL del panel de Mercado Pago. */
  getRedirectUri(): string {
    const explicit = this.configService.get<string>('MP_REDIRECT_URI', '')?.trim();
    if (explicit) {
      return explicit.replace(/\/+$/, '');
    }
    const baseBack = this.configService
      .get<string>('BASE_URL_BACK', '')
      ?.trim()
      .replace(/\/+$/, '');
    if (baseBack) {
      return `${baseBack}/mp/callback`;
    }
    return '';
  }

  getAuthUrl(sellerId: number): string {
    const redirectUri = this.getRedirectUri();
    if (!this.appId || !redirectUri) {
      throw new Error(
        'MercadoPago OAuth: configurá MP_APP_ID y MP_REDIRECT_URI (o BASE_URL_BACK para derivar .../mp/callback)',
      );
    }
    const state = Buffer.from(JSON.stringify({ sellerId })).toString('base64url');
    return (
      `https://auth.mercadopago.com.ar/authorization?` +
      `client_id=${encodeURIComponent(this.appId)}` +
      `&response_type=code` +
      `&platform_id=mp` +
      `&state=${encodeURIComponent(state)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}`
    );
  }

  private parseState(state: string): { sellerId: number } {
    try {
      return JSON.parse(Buffer.from(state, 'base64url').toString());
    } catch {
      return JSON.parse(Buffer.from(state, 'base64').toString());
    }
  }

  async handleOAuthCallback(code: string, state: string): Promise<{ sellerId: number }> {
    const { sellerId } = this.parseState(state);
    const redirectUri = this.getRedirectUri();

    const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_secret: this.clientSecret,
        client_id: this.appId,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Error en OAuth de MercadoPago: ${error}`);
    }

    const data: OAuthTokenResponse = await tokenResponse.json();

    await this.usersService.saveMpCredentials(sellerId, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      userId: data.user_id.toString(),
    });

    return { sellerId };
  }

  async refreshSellerToken(userId: number): Promise<string> {
    const user = await this.usersService.findById(userId);
    if (!user?.mp_refresh_token) {
      throw new Error('El usuario no tiene token de MercadoPago');
    }

    const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_secret: this.clientSecret,
        client_id: this.appId,
        grant_type: 'refresh_token',
        refresh_token: user.mp_refresh_token,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Error al refrescar token de MercadoPago');
    }

    const data: OAuthTokenResponse = await tokenResponse.json();

    await this.usersService.saveMpCredentials(userId, {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      userId: data.user_id.toString(),
    });

    return data.access_token;
  }

  async disconnect(userId: number): Promise<void> {
    await this.usersService.clearMpCredentials(userId);
  }
}
