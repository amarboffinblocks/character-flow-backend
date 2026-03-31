import argon2 from 'argon2';
import { authRepository } from './auth.repository.js';
import { createError, omit } from '../../utils/index.js';
import { safeAsync } from '../../utils/helpers.js';
import { usernameService } from './username.service.js';
import {
  deleteUploadedImageIfExists,
  transformEntityImageUrls,
} from '../../lib/cloudinary.service.js';
import type { MessageResponse, UserWithoutPassword } from './auth.types.js';
import type { AuthUser } from '../../types/index.js';
import type { User } from '@prisma/client';
import { config } from '../../config/index.js';

const USERNAME_CHANGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const GUEST_PASSWORD_PLACEHOLDER = 'not-used-open-access';

async function ensureGuestUserRow(): Promise<User> {
  const email = config.auth.defaultUserEmail.toLowerCase();
  const username = config.auth.defaultUsername;
  const name = config.auth.defaultUserName;

  let userRow = await authRepository.findUserByEmail(email);
  if (!userRow) {
    const passwordHash = await argon2.hash(GUEST_PASSWORD_PLACEHOLDER, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
    try {
      userRow = await authRepository.createUser({
        name,
        username,
        email,
        password: passwordHash,
      });
    } catch (error) {
      const prismaError = error as { code?: string };
      if (prismaError.code === 'P2002') {
        userRow = await authRepository.findUserByEmail(email);
      }
      if (!userRow) {
        throw error;
      }
    }
  }

  if (!userRow.isEmailVerified) {
    userRow = await authRepository.verifyUserEmail(userRow.id);
  }

  return userRow;
}

function userToAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    role: user.role as 'user' | 'admin',
  };
}

export const authService = {
  async getGuestAuthUser(): Promise<AuthUser> {
    const row = await ensureGuestUserRow();
    return userToAuthUser(row);
  },

  /**
   * Idempotent entry — ensures guest exists (for /auth/login UX).
   */
  async instantLogin(): Promise<{ user: UserWithoutPassword }> {
    const userRow = await ensureGuestUserRow();
    const user = await authRepository.findUserById(userRow.id);
    if (!user) {
      throw createError.internal('Failed to load user');
    }

    const safeUser = omit(user, ['password']);
    return {
      user: await transformEntityImageUrls(safeUser),
    };
  },

  async logout(): Promise<MessageResponse> {
    return { message: 'OK' };
  },

  async getUserById(userId: string): Promise<UserWithoutPassword> {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw createError.notFound('User not found');
    }

    const safeUser = omit(user, ['password']);
    return await transformEntityImageUrls(safeUser);
  },

  async updateProfile(
    userId: string,
    data: {
      name?: string;
      username?: string;
      aboutMe?: string | null;
      theme?: string;
      fontStyle?: string;
      fontSize?: string;
      language?: string;
      tagsToFollow?: string[];
      tagsToAvoid?: string[];
      profileVisibility?: 'public' | 'private';
      profileRating?: 'SFW' | 'NSFW';
      subscriptionPlan?: 'adventurer' | 'explorer' | 'voyager' | 'pioneer';
      avatar?: Record<string, unknown> | null;
      backgroundImg?: Record<string, unknown> | null;
    }
  ): Promise<UserWithoutPassword> {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw createError.notFound('User not found');
    }

    if (data.username && data.username !== user.username) {
      if (user.usernameChangedAt) {
        const elapsedMs = Date.now() - new Date(user.usernameChangedAt).getTime();
        if (elapsedMs < USERNAME_CHANGE_COOLDOWN_MS) {
          const remainingMs = USERNAME_CHANGE_COOLDOWN_MS - elapsedMs;
          const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
          throw createError.validation(`You can change your username again in ${remainingHours} hour(s).`);
        }
      }

      const existingUser = await authRepository.findUserByUsername(data.username);
      if (existingUser) {
        throw createError.conflict('Username already taken');
      }

      await safeAsync(() => usernameService.invalidateCache(user.username));
    }

    if (data.avatar !== undefined && data.avatar !== null) {
      const oldAvatar = user.avatar as { url?: string } | null;
      if (oldAvatar?.url) await deleteUploadedImageIfExists(oldAvatar.url);
    }
    if (data.avatar === null) {
      const oldAvatar = user.avatar as { url?: string } | null;
      if (oldAvatar?.url) await deleteUploadedImageIfExists(oldAvatar.url);
    }
    if (data.backgroundImg !== undefined && data.backgroundImg !== null) {
      const oldBg = user.backgroundImg as { url?: string } | null;
      if (oldBg?.url) await deleteUploadedImageIfExists(oldBg.url);
    }
    if (data.backgroundImg === null) {
      const oldBg = user.backgroundImg as { url?: string } | null;
      if (oldBg?.url) await deleteUploadedImageIfExists(oldBg.url);
    }

    const isUsernameChanged = Boolean(data.username && data.username !== user.username);

    const updatedUser = await authRepository.updateUser(userId, {
      ...data,
      ...(isUsernameChanged ? { usernameChangedAt: new Date() } : {}),
    });

    if (data.username && data.username !== user.username) {
      const newUsername = data.username;
      await safeAsync(() => usernameService.invalidateCache(newUsername));
    }

    const safeUser = omit(updatedUser, ['password']);
    return await transformEntityImageUrls(safeUser);
  },
};

export default authService;
