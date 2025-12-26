import { Injectable, Inject } from '@nestjs/common';
import { eq, or } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../database/database.module';
import { users, User, NewUser } from '../database/schema';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private db: PostgresJsDatabase<typeof import('../database/schema')>,
  ) {}

  async create(data: NewUser): Promise<User> {
    const [user] = await this.db.insert(users).values(data).returning();
    return user;
  }

  async findById(id: string): Promise<User | null> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return user || null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return user || null;
  }





  async findByWalletAddress(walletAddress: string): Promise<User | null> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.walletAddress, walletAddress.toLowerCase()))
      .limit(1);
    return user || null;
  }

  async updateUsername(userId: string, newUsername: string): Promise<User> {
    const [updatedUser] = await this.db
      .update(users)
      .set({ username: newUsername })
      .where(eq(users.id, userId))
      .returning();
    return updatedUser;
  }
}
