import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { SiweMessage } from 'siwe';
import { UsersService } from '../users/users.service';
import { VillagesService } from '../villages/villages.service';
import { UpdateUsernameDto, VerifySiweDto } from './dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { uniqueNamesGenerator, adjectives, animals, NumberDictionary } from 'unique-names-generator';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  // In-memory nonce storage (in production, use Redis)
  private nonces: Map<string, { nonce: string; expiresAt: number }> = new Map();

  constructor(
    private usersService: UsersService,
    private villagesService: VillagesService,
    private jwtService: JwtService,
  ) {
    // Clean up expired nonces every 5 minutes
    setInterval(() => this.cleanupExpiredNonces(), 5 * 60 * 1000);
  }

  /**
   * Generate a nonce for SIWE authentication
   */
  async generateNonce(walletAddress: string): Promise<string> {
    const nonce = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    this.nonces.set(walletAddress.toLowerCase(), { nonce, expiresAt });

    return nonce;
  }

  /**
   * Verify SIWE signature and login or register user
   */
  async verifySiweAndLogin(verifySiweDto: VerifySiweDto) {
    const { message, signature, walletAddress } = verifySiweDto;
    const normalizedAddress = walletAddress.toLowerCase();

    // Get stored nonce
    const storedNonce = this.nonces.get(normalizedAddress);
    if (!storedNonce) {
      throw new BadRequestException('Nonce not found or expired');
    }

    // Check if nonce expired
    if (Date.now() > storedNonce.expiresAt) {
      this.nonces.delete(normalizedAddress);
      throw new BadRequestException('Nonce expired');
    }

    // Verify SIWE message
    try {
      const siweMessage = new SiweMessage(message);
      const fields = await siweMessage.verify({ signature });

      // Verify the nonce matches
      if (fields.data.nonce !== storedNonce.nonce) {
        throw new BadRequestException('Invalid nonce');
      }

      // Verify the address matches
      if (fields.data.address.toLowerCase() !== normalizedAddress) {
        throw new BadRequestException('Address mismatch');
      }

      // Delete used nonce
      this.nonces.delete(normalizedAddress);

      // Check if user exists
      let user = await this.usersService.findByWalletAddress(normalizedAddress);

      if (!user) {
        // New user - create account with auto-generated username
        const username = await this.generateUniqueUsername();
        user = await this.usersService.create({
          username,
          walletAddress: normalizedAddress,
        });

        // Create initial village
        await this.villagesService.createInitialVillage(user.id, `${user.username}'s Village`);
      }

      // Get user's village
      const village = await this.villagesService.findByUserId(user.id);

      // Generate JWT token
      const payload: JwtPayload = {
        sub: user.id,
        username: user.username,
        villageId: village?.id,
      };
      const accessToken = this.jwtService.sign(payload);

      return {
        accessToken,
        user: {
          id: user.id,
          username: user.username,
          walletAddress: user.walletAddress,
        },
      };
    } catch (error) {
      throw new UnauthorizedException('Invalid signature or message');
    }
  }

  /**
   * Generate a unique username using unique-names-generator
   */
  private async generateUniqueUsername(): Promise<string> {
    const numberDictionary = NumberDictionary.generate({ min: 1, max: 999 });
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      const username = uniqueNamesGenerator({
        dictionaries: [adjectives, animals, numberDictionary],
        separator: '-',
        style: 'lowerCase',
        length: 3,
      });

      // Check if username is taken
      const existing = await this.usersService.findByUsername(username);
      if (!existing) {
        return username;
      }

      attempts++;
    }

    // Fallback: use timestamp if generation fails
    return `player-${Date.now()}`;
  }

  /**
   * Clean up expired nonces
   */
  private cleanupExpiredNonces() {
    const now = Date.now();
    for (const [address, { expiresAt }] of this.nonces.entries()) {
      if (now > expiresAt) {
        this.nonces.delete(address);
      }
    }
  }

  async validateUser(userId: string) {
    return this.usersService.findById(userId);
  }

  async updateUsername(userId: string, updateUsernameDto: UpdateUsernameDto) {
    // Check if username is already taken
    const existingUser = await this.usersService.findByUsername(updateUsernameDto.username);

    if (existingUser && existingUser.id !== userId) {
      throw new ConflictException('Username already exists');
    }

    // Update username
    const updatedUser = await this.usersService.updateUsername(userId, updateUsernameDto.username);

    return {
      userId: updatedUser.id,
      username: updatedUser.username,
      walletAddress: updatedUser.walletAddress,
    };
  }
}
