import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { User, UserType } from '../entities/user.entity';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const user = await this.usersService.create({
      name: dto.name,
      email: dto.email,
      password: dto.password,
      type: dto.type ?? UserType.BUYER,
    });

    return this.buildAuthResponse(user);
  }

  async login(user: User) {
    return this.buildAuthResponse(user);
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const user = await this.usersService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException();
      }

      return this.buildAuthResponse(user);
    } catch {
      throw new UnauthorizedException('Token de refresco inválido');
    }
  }

  private buildAuthResponse(user: User) {
    const payload = { sub: user.id, email: user.email, type: user.type };

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        type: user.type,
        mpConnected: !!user.mp_access_token,
      },
      accessToken: this.jwtService.sign(payload),
      refreshToken: this.jwtService.sign(payload, {
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d') as any,
      }),
    };
  }
}
