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
  private redirectUri: string;

  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
  ) {
    this.appId = this.configService.get<string>('MP_APP_ID', '');
    this.clientSecret = this.configService.get<string>('MP_CLIENT_SECRET', '');
    this.redirectUri = this.configService.get<string>('MP_REDIRECT_URI', '');
  }

  getAuthUrl(sellerId: number): string {
    const state = Buffer.from(JSON.stringify({ sellerId })).toString('base64');
    return (
      `https://auth.mercadopago.com.ar/authorization?` +
      `client_id=${this.appId}` +
      `&response_type=code` +
      `&platform_id=mp` +
      `&state=${state}` +
      `&redirect_uri=${encodeURIComponent(this.redirectUri)}`
    );
  }

  async handleOAuthCallback(code: string, state: string): Promise<{ sellerId: number }> {
    const { sellerId } = JSON.parse(Buffer.from(state, 'base64').toString());

    const tokenResponse = await fetch('https://api.mercadopago.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_secret: this.clientSecret,
        client_id: this.appId,
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
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
