import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, UserType } from '../entities/user.entity';

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async create(data: {
    name: string;
    email: string;
    password: string;
    type?: UserType;
  }): Promise<User> {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new ConflictException('Ya existe un usuario con ese email');
    }

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

    const user = this.userRepository.create({
      name: data.name,
      email: data.email,
      password_hash: passwordHash,
      type: data.type ?? UserType.BUYER,
    });

    return this.userRepository.save(user);
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.password_hash);
  }

  async saveMpCredentials(
    userId: number,
    credentials: {
      accessToken: string;
      refreshToken: string;
      userId: string;
    },
  ): Promise<User> {
    await this.userRepository.update(userId, {
      mp_access_token: credentials.accessToken,
      mp_refresh_token: credentials.refreshToken,
      mp_user_id: credentials.userId,
    });
    return this.findById(userId) as Promise<User>;
  }

  async clearMpCredentials(userId: number): Promise<void> {
    await this.userRepository.update(userId, {
      mp_access_token: null as any,
      mp_refresh_token: null as any,
      mp_user_id: null as any,
    });
  }

  async getMpAccessToken(userId: number): Promise<string | null> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['id', 'mp_access_token'],
    });
    return user?.mp_access_token || null;
  }
}
