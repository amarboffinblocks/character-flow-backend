import { prisma } from '../../lib/prisma.js';
import { nanoid } from 'nanoid';
import { addTime } from '../../utils/helpers.js';
import { createError } from '../../utils/index.js';
import { logger } from '../../lib/logger.js';
import { cache, rateLimitStore } from '../../lib/redis.js';

// ============================================
// OTP Configuration
// ============================================

const OTP_CONFIG = {
  LENGTH: 6,
  EXPIRY_MINUTES: 5,
  MAX_ATTEMPTS: 3,
  RATE_LIMIT_SECONDS: 60, // Can request new OTP after 60 seconds
} as const;

// ============================================
// OTP Service
// ============================================

export const otpService = {
  // ============================================
  // Generate OTP Code
  // ============================================

  generateCode(): string {
    // Generate 6-digit numeric code
    let code = '';
    for (let i = 0; i < OTP_CONFIG.LENGTH; i++) {
      code += Math.floor(Math.random() * 10);
    }
    return code;
  },

  // ============================================
  // Create OTP Record
  // ============================================

  async createOtp(
    userId: string,
    type: 'login' | 'email_verification' | 'phone_verification' | 'password_reset',
    method: 'email' | 'sms',
    recipient: string
  ): Promise<{ code: string; expiresAt: Date }> {
    // Check rate limit using sliding window (prevent spam)
    const rateLimitKey = `otp:${userId}:${type}`;
    const rateLimitResult = await rateLimitStore.check(
      rateLimitKey,
      5, // Max 5 OTPs per hour
      OTP_CONFIG.RATE_LIMIT_SECONDS // Window: 60 seconds
    );

    if (!rateLimitResult.allowed) {
      throw createError.tooManyRequests(
        `Please wait ${rateLimitResult.resetIn} seconds before requesting a new OTP`
      );
    }

    // Invalidate any existing OTPs of the same type for this user
    await prisma.otp.updateMany({
      where: {
        userId,
        type,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        usedAt: new Date(), // Mark as used to invalidate
      },
    });

    // Generate OTP code
    const code = this.generateCode();
    const expiresAt = addTime(new Date(), `${OTP_CONFIG.EXPIRY_MINUTES}m`);

    // Create OTP record
    await prisma.otp.create({
      data: {
        userId,
        code,
        type,
        method,
        recipient: recipient.toLowerCase(),
        maxAttempts: OTP_CONFIG.MAX_ATTEMPTS,
        expiresAt,
      },
    });

    // Store OTP in Redis for quick verification (with shorter TTL)
    const otpCacheKey = `otp:${userId}:${type}:${code}`;
    await cache.set(otpCacheKey, { userId, type, method, recipient }, OTP_CONFIG.EXPIRY_MINUTES * 60);

    logger.info({ userId, type, method, recipient: recipient.substring(0, 3) + '***' }, 'OTP created');

    return { code, expiresAt };
  },

  // ============================================
  // Verify OTP
  // ============================================

  async verifyOtp(
    userId: string,
    code: string,
    type: 'login' | 'email_verification' | 'phone_verification' | 'password_reset'
  ): Promise<{ valid: boolean; otp?: { id: string; method: string; recipient: string } }> {
    // Check Redis cache first (faster)
    const otpCacheKey = `otp:${userId}:${type}:${code}`;
    const cachedOtp = await cache.get<{ userId: string; type: string; method: string; recipient: string }>(otpCacheKey);

    if (cachedOtp) {
      // Find OTP in database
      const otp = await prisma.otp.findFirst({
        where: {
          userId,
          code,
          type,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (otp) {
        // Check attempts
        if (otp.attempts >= otp.maxAttempts) {
          await prisma.otp.update({
            where: { id: otp.id },
            data: { usedAt: new Date() },
          });
          throw createError.badRequest('OTP has exceeded maximum attempts. Please request a new OTP.');
        }

        // Increment attempts
        await prisma.otp.update({
          where: { id: otp.id },
          data: { attempts: { increment: 1 } },
        });

        // Mark as used
        await prisma.otp.update({
          where: { id: otp.id },
          data: { usedAt: new Date() },
        });

        // Remove from cache
        await cache.del(otpCacheKey);

        logger.info({ userId, type }, 'OTP verified successfully');

        return {
          valid: true,
          otp: {
            id: otp.id,
            method: otp.method,
            recipient: otp.recipient,
          },
        };
      }
    }

    // If not in cache, check database
    const otp = await prisma.otp.findFirst({
      where: {
        userId,
        code,
        type,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      return { valid: false };
    }

    // Check attempts
    if (otp.attempts >= otp.maxAttempts) {
      await prisma.otp.update({
        where: { id: otp.id },
        data: { usedAt: new Date() },
      });
      throw createError.badRequest('OTP has exceeded maximum attempts. Please request a new OTP.');
    }

    // Increment attempts
    await prisma.otp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });

    // Mark as used
    await prisma.otp.update({
      where: { id: otp.id },
      data: { usedAt: new Date() },
    });

    logger.info({ userId, type }, 'OTP verified successfully');

    return {
      valid: true,
      otp: {
        id: otp.id,
        method: otp.method,
        recipient: otp.recipient,
      },
    };
  },

  // ============================================
  // Validate OTP (without marking as used)
  // ============================================

  async validateOtp(
    userId: string,
    code: string,
    type: 'login' | 'email_verification' | 'phone_verification' | 'password_reset'
  ): Promise<boolean> {
    const otp = await prisma.otp.findFirst({
      where: {
        userId,
        code,
        type,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      return false;
    }

    if (otp.attempts >= otp.maxAttempts) {
      return false;
    }

    return true;
  },

  // ============================================
  // Cleanup Expired OTPs
  // ============================================

  async cleanupExpiredOtps(): Promise<number> {
    const result = await prisma.otp.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });

    logger.info({ count: result.count }, 'Cleaned up expired OTPs');
    return result.count;
  },

  // ============================================
  // Invalidate All OTPs for User
  // ============================================

  async invalidateUserOtps(userId: string, type?: string): Promise<void> {
    await prisma.otp.updateMany({
      where: {
        userId,
        ...(type && { type }),
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });
  },
};

export default otpService;

