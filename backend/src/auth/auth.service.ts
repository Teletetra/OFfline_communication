
// backend/src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { PasswordReset } from './entities/password-reset.entity';
import { UsersService } from '../users/users.service';
import { EncryptionService } from '../encryption/encryption.service';
import { QueueService } from '../queue/queue.service';
import { v4 as uuidv4 } from 'uuid';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { addMinutes, addDays, isAfter } from 'date-fns';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    @InjectRepository(PasswordReset)
    private readonly passwordResetRepository: Repository<PasswordReset>,
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly encryptionService: EncryptionService,
    private readonly queueService: QueueService,
  ) {}

  async register(registerDto: any): Promise<any> {
    const { email, username, password } = registerDto;

    // Check if user already exists
    const existingUser = await this.usersService.findByEmailOrUsername(email, username);
    if (existingUser) {
      throw new ConflictException('User with this email or username already exists');
    }

    // Generate encryption keys for the user
    const keyPair = await this.encryptionService.generateKeyPair();

    // Create user with hashed password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const user = await this.usersService.create({
      email,
      username,
      password: hashedPassword,
      publicKey: keyPair.publicKey,
      deviceInfo: {
        bluetoothEnabled: true,
        deviceName: 'default',
        lastConnectedDevice: null,
      },
    });

    // Store private key securely (encrypted with user's password)
    const encryptedPrivateKey = await this.encryptionService.encryptPrivateKey(
      keyPair.privateKey,
      password,
    );
    await this.usersService.updatePrivateKey(user.id, encryptedPrivateKey);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Send welcome email
    await this.queueService.addJob('send-email', {
      to: user.email,
      template: 'welcome',
      data: { username: user.username },
    });

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async login(loginDto: any): Promise<any> {
    const { email, password } = loginDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if account is locked
    if (user.isLocked && user.lockUntil && isAfter(new Date(user.lockUntil), new Date())) {
      throw new UnauthorizedException('Account is locked. Please try again later.');
    }

    // Update last login
    await this.usersService.updateLastLogin(user.id);

    // Generate tokens
    const tokens = await this.generateTokens(user);

    // Decrypt and cache private key for session
    const privateKey = await this.encryptionService.decryptPrivateKey(
      user.encryptedPrivateKey,
      password,
    );

    return {
      user: this.sanitizeUser(user),
      ...tokens,
    };
  }

  async refreshToken(refreshTokenDto: any): Promise<any> {
    const { refreshToken } = refreshTokenDto;

    const tokenEntity = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
      relations: ['user'],
    });

    if (!tokenEntity) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check if token is expired
    if (isAfter(new Date(), tokenEntity.expiresAt)) {
      await this.refreshTokenRepository.remove(tokenEntity);
      throw new UnauthorizedException('Refresh token expired');
    }

    // Check if token is revoked
    if (tokenEntity.isRevoked) {
      throw new UnauthorizedException('Refresh token revoked');
    }

    // Rotate refresh token
    tokenEntity.isRevoked = true;
    await this.refreshTokenRepository.save(tokenEntity);

    return this.generateTokens(tokenEntity.user);
  }

  async logout(userId: string, refreshToken: string): Promise<void> {
    const tokenEntity = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken, userId },
    });

    if (tokenEntity) {
      tokenEntity.isRevoked = true;
      await this.refreshTokenRepository.save(tokenEntity);
    }
  }

  async changePassword(userId: string, changePasswordDto: any): Promise<void> {
    const { currentPassword, newPassword } = changePasswordDto;

    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    // Check password strength
    if (!this.isPasswordStrong(newPassword)) {
      throw new BadRequestException('Password does not meet security requirements');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.usersService.updatePassword(userId, hashedPassword);

    // Revoke all refresh tokens
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true },
    );

    // Send password change notification
    await this.queueService.addJob('send-email', {
      to: user.email,
      template: 'password-changed',
      data: { username: user.username },
    });
  }

  async forgotPassword(forgotPasswordDto: any): Promise<void> {
    const { email } = forgotPasswordDto;

    const user = await this.usersService.findByEmail(email);
    if (!user) {
      // Don't reveal if email exists
      return;
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = addMinutes(new Date(), 30);

    await this.passwordResetRepository.save({
      userId: user.id,
      token,
      expiresAt,
      isUsed: false,
    });

    // Send reset email
    await this.queueService.addJob('send-email', {
      to: user.email,
      template: 'password-reset',
      data: {
        username: user.username,
        resetUrl: `${this.configService.get('FRONTEND_URL')}/reset-password?token=${token}`,
      },
    });
  }

  async resetPassword(resetPasswordDto: any): Promise<void> {
    const { token, newPassword } = resetPasswordDto;

    const resetEntity = await this.passwordResetRepository.findOne({
      where: { token, isUsed: false },
    });

    if (!resetEntity || isAfter(new Date(), resetEntity.expiresAt)) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    if (!this.isPasswordStrong(newPassword)) {
      throw new BadRequestException('Password does not meet security requirements');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.usersService.updatePassword(resetEntity.userId, hashedPassword);

    resetEntity.isUsed = true;
    await this.passwordResetRepository.save(resetEntity);

    // Revoke all refresh tokens
    await this.refreshTokenRepository.update(
      { userId: resetEntity.userId, isRevoked: false },
      { isRevoked: true },
    );
  }

  async validateUser(userId: string, password: string): Promise<User | null> {
    const user = await this.usersService.findById(userId);
    if (user && await bcrypt.compare(password, user.password)) {
      return user;
    }
    return null;
  }

  private async generateTokens(user: User): Promise<any> {
    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
      roles: user.roles || ['user'],
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '15m'),
    });

    const refreshToken = uuidv4();
    const refreshTokenEntity = this.refreshTokenRepository.create({
      token: refreshToken,
      userId: user.id,
      expiresAt: addDays(new Date(), 7),
      isRevoked: false,
      userAgent: 'default',
      ipAddress: '0.0.0.0',
    });

    await this.refreshTokenRepository.save(refreshTokenEntity);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  private isPasswordStrong(password: string): boolean {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    return (
      password.length >= minLength &&
      hasUpperCase &&
      hasLowerCase &&
      hasNumbers &&
      hasSpecialChar
    );
  }

  private sanitizeUser(user: User): any {
    const { password, encryptedPrivateKey, ...sanitizedUser } = user;
    return sanitizedUser;
  }
}