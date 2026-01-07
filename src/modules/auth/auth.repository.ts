import { prisma } from '../../lib/prisma.js';
import type { User } from '@prisma/client';
import type { CreateUserData, SessionData, TokenData } from './auth.types.js';

// ============================================
// User Repository
// ============================================

export const authRepository = {
  // ============================================
  // User Operations
  // ============================================

  async findUserById(id: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { id },
    });
  },

  async findUserByEmail(email: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  },

  async findUserByUsername(username: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { username },
    });
  },

  async findUserByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return prisma.user.findUnique({
      where: { phoneNumber },
    });
  },

  /**
   * Find user by identifier (phone, email, or username)
   */
  async findUserByIdentifier(identifier: string): Promise<User | null> {
    // Check if it's a phone number (starts with +)
    if (identifier.startsWith('+')) {
      return this.findUserByPhoneNumber(identifier);
    }

    // Check if it's an email (contains @)
    if (identifier.includes('@')) {
      return this.findUserByEmail(identifier);
    }

    // Otherwise, treat as username
    return this.findUserByUsername(identifier);
  },

  async createUser(data: CreateUserData): Promise<User> {
    return prisma.user.create({
      data: {
        name: data.name,
        username: data.username,
        email: data.email.toLowerCase(),
        phoneNumber: data.phoneNumber,
        password: data.password,
      },
    });
  },

  async updateUserPassword(userId: string, hashedPassword: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
  },

  async verifyUserEmail(userId: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { isEmailVerified: true },
    });
  },

  async verifyUserPhone(userId: string): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: { isPhoneVerified: true },
    });
  },

  async updateUser(
    userId: string,
    data: {
      name?: string;
      username?: string;
      aboutMe?: string | null;
      theme?: string | null;
      fontStyle?: string | null;
      fontSize?: string | null;
      language?: string | null;
      tagsToFollow?: string[];
      tagsToAvoid?: string[];
      profileVisibility?: 'public' | 'private';
      profileRating?: 'SFW' | 'NSFW';
    }
  ): Promise<User> {
    return prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.username && { username: data.username }),
        ...(data.aboutMe !== undefined && { aboutMe: data.aboutMe }),
        ...(data.theme !== undefined && { theme: data.theme }),
        ...(data.fontStyle !== undefined && { fontStyle: data.fontStyle }),
        ...(data.fontSize !== undefined && { fontSize: data.fontSize }),
        ...(data.language !== undefined && { language: data.language }),
        ...(data.tagsToFollow !== undefined && { tagsToFollow: data.tagsToFollow }),
        ...(data.tagsToAvoid !== undefined && { tagsToAvoid: data.tagsToAvoid }),
        ...(data.profileVisibility && { profileVisibility: data.profileVisibility }),
        ...(data.profileRating && { profileRating: data.profileRating }),
      },
    });
  },

  async deleteUser(userId: string): Promise<void> {
    await prisma.user.delete({
      where: { id: userId },
    });
  },

  // ============================================
  // Auth Token Operations
  // ============================================

  async createAuthToken(data: TokenData & { token: string }): Promise<void> {
    await prisma.authToken.create({
      data: {
        userId: data.userId,
        token: data.token,
        type: data.type,
        expiresAt: data.expiresAt,
      },
    });
  },

  async findAuthToken(token: string): Promise<{
    id: string;
    userId: string;
    token: string;
    type: string;
    expiresAt: Date;
    usedAt: Date | null;
  } | null> {
    return prisma.authToken.findUnique({
      where: { token },
    });
  },

  async markAuthTokenUsed(tokenId: string): Promise<void> {
    await prisma.authToken.update({
      where: { id: tokenId },
      data: { usedAt: new Date() },
    });
  },

  async deleteAuthToken(tokenId: string): Promise<void> {
    await prisma.authToken.delete({
      where: { id: tokenId },
    });
  },

  async deleteExpiredTokens(): Promise<void> {
    await prisma.authToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  },

  async deleteUserAuthTokens(userId: string, type?: string): Promise<void> {
    await prisma.authToken.deleteMany({
      where: {
        userId,
        ...(type && { type }),
      },
    });
  },

  // ============================================
  // Session Operations
  // ============================================

  async createSession(data: SessionData): Promise<void> {
    await prisma.session.create({
      data: {
        userId: data.userId,
        refreshToken: data.refreshToken,
        userAgent: data.userAgent,
        ipAddress: data.ipAddress,
        expiresAt: data.expiresAt,
      },
    });
  },

  async findSession(refreshToken: string): Promise<{
    id: string;
    userId: string;
    refreshToken: string;
    expiresAt: Date;
  } | null> {
    return prisma.session.findUnique({
      where: { refreshToken },
    });
  },

  async deleteSession(refreshToken: string): Promise<void> {
    try {
      await prisma.session.delete({
        where: { refreshToken },
      });
    } catch (error) {
      // Ignore if session doesn't exist (P2025)
      const prismaError = error as { code?: string };
      if (prismaError.code !== 'P2025') {
        throw error;
      }
    }
  },

  async deleteUserSessions(userId: string): Promise<void> {
    await prisma.session.deleteMany({
      where: { userId },
    });
  },

  async deleteExpiredSessions(): Promise<void> {
    await prisma.session.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  },

  async countUserSessions(userId: string): Promise<number> {
    return prisma.session.count({
      where: { userId },
    });
  },
};

export default authRepository;

