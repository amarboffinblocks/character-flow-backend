import argon2 from 'argon2';
import { nanoid } from 'nanoid';
import { authRepository } from './auth.repository.js';
import {
  generateTokenPair,
  verifyRefreshToken,
  getRefreshTokenExpiry,
} from './auth.session.js';
import { createError, omit } from '../../utils/index.js';
import { safeAsync } from '../../utils/helpers.js';
import { addTime } from '../../utils/helpers.js';
import { otpService } from './otp.service.js';
import { usernameService } from './username.service.js';
import { emailService } from '../../lib/email.service.js';
import { smsService } from '../../lib/sms.service.js';
import { logger } from '../../lib/logger.js';
import { config } from '../../config/index.js';
import {
  deleteFromS3IfExists,
  transformEntityImageUrls,
} from '../../lib/s3.service.js';
import type {
  RegisterInput,
  LoginInput,
  AuthResponse,
  RegisterResponse,
  RefreshResponse,
  MessageResponse,
  UserWithoutPassword,
  RequestOtpInput,
  VerifyOtpInput,
  OtpRequestResponse,
} from './auth.types.js';

const USERNAME_CHANGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

// ============================================
// Auth Service with 2FA/OTP
// ============================================

export const authService = {
  // ============================================
  // Register
  // ============================================

  async register(input: RegisterInput): Promise<RegisterResponse> {
    // Validate phone number if provided (simple digits-only format).
    if (input.phoneNumber && !/^\d{7,15}$/.test(input.phoneNumber)) {
      throw createError.validation('Invalid phone number format. Use 7-15 digits.');
    }

    // Check if email already exists
    const existingEmail = await authRepository.findUserByEmail(input.email);
    if (existingEmail) {
      throw createError.conflict('Email already registered');
    }

    // Check if username already exists
    const existingUsername = await authRepository.findUserByUsername(input.username);
    if (existingUsername) {
      throw createError.conflict('Username already taken');
    }

    // Check if phone number already exists (if provided)
    if (input.phoneNumber) {
      const existingPhone = await authRepository.findUserByPhoneNumber(input.phoneNumber);
      if (existingPhone) {
        throw createError.conflict('Phone number already registered');
      }
    }

    // Hash password
    const hashedPassword = await argon2.hash(input.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // Create user
    const user = await authRepository.createUser({
      name: input.name,
      username: input.username,
      email: input.email,
      phoneNumber: input.phoneNumber,
      password: hashedPassword,
    });

    // Generate email verification token
    const verificationToken = nanoid(32);
    await authRepository.createAuthToken({
      userId: user.id,
      token: verificationToken,
      type: 'email_verification',
      expiresAt: addTime(new Date(), '24h'),
    });

    // Send verification email (with proper error handling)
    try {
      await emailService.sendVerificationEmail(user.email, verificationToken);
    } catch (error) {
      // Log error but don't fail registration
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({
        err: error,
        userId: user.id,
        email: user.email
      }, 'Failed to send verification email during registration');

      // In development, we can still proceed, but log the error
      // In production, you might want to queue the email for retry
      // For now, we'll proceed with registration but the error will be visible in logs
    }

    // Invalidate username cache since it's now taken (non-blocking)
    await safeAsync(() => usernameService.invalidateCache(input.username));

    const safeUser = omit(user, ['password']);

    return {
      user: safeUser,
      message: 'Registration successful. Please check your email to verify your account.',
    };
  },

  // ============================================
  // Login - Step 1: Verify Credentials & Request OTP
  // ============================================

  async loginStep1(input: LoginInput): Promise<OtpRequestResponse> {
    // Find user by identifier (phone, email, or username)
    const user = await authRepository.findUserByIdentifier(input.identifier);
    if (!user) {
      // Don't reveal if user exists (security best practice)
      throw createError.unauthorized('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await argon2.verify(user.password, input.password);
    if (!isPasswordValid) {
      throw createError.unauthorized('Invalid credentials');
    }

    // Check if email is verified (required for login)
    if (!user.isEmailVerified) {
      throw createError.forbidden('Please verify your email address before logging in. Check your email for the verification link.');
    }

    // Determine OTP delivery method based on login identifier
    let otpMethod: 'email' | 'sms' = 'email';
    let recipient = user.email;

    // If login was with phone number, send OTP via SMS
    if (input.identifier.startsWith('+')) {
      if (!user.phoneNumber) {
        throw createError.badRequest('Phone number not registered. Please login with email or username.');
      }
      otpMethod = 'sms';
      recipient = user.phoneNumber;
    } else if (input.identifier.includes('@')) {
      // Login with email - send OTP via email
      otpMethod = 'email';
      recipient = user.email;
    } else {
      // Login with username - send OTP via email (default)
      otpMethod = 'email';
      recipient = user.email;
    }

    // Create OTP
    const { code, expiresAt } = await otpService.createOtp(
      user.id,
      'login',
      otpMethod,
      recipient
    );

    // Send OTP with graceful fallback
    let otpSent = false;
    try {
      if (otpMethod === 'sms') {
        otpSent = await smsService.sendOtp(recipient, code);
        if (!otpSent) {
          // Fallback to email if SMS fails
          logger.warn({ userId: user.id, phone: recipient }, 'SMS failed, falling back to email');
          await safeAsync(() => otpService.invalidateUserOtps(user.id, 'login'));
          const emailOtp = await otpService.createOtp(user.id, 'login', 'email', user.email);
          otpSent = await emailService.sendOtpEmail(user.email, emailOtp.code);
          otpMethod = 'email';
          recipient = user.email;
        }
      } else {
        otpSent = await emailService.sendOtpEmail(recipient, code);
      }
    } catch (error) {
      logger.error({ err: error, userId: user.id, method: otpMethod }, 'Failed to send OTP');
      // If email also fails, throw error
      throw createError.email('Failed to send verification code. Please try again.', error instanceof Error ? error : undefined);
    }

    if (!otpSent) {
      throw createError.email('Failed to send verification code. Please try again.');
    }

    logger.info({ userId: user.id, method: otpMethod, recipient: recipient.substring(0, 3) + '***' }, 'OTP sent for login');

    return {
      userId: user.id,
      message: `Verification code sent to ${otpMethod === 'sms' ? 'your phone' : 'your email'}. Please check and enter the 6-digit code.`,
      verificationMethod: otpMethod,
      expiresAt: expiresAt.toISOString(),
    };
  },

  // ============================================
  // Login - Step 2: Verify OTP & Complete Login
  // ============================================

  async loginStep2(
    input: VerifyOtpInput,
    meta?: { userAgent?: string; ipAddress?: string }
  ): Promise<AuthResponse> {
    // Verify OTP
    const otpResult = await otpService.verifyOtp(input.userId, input.code, 'login');

    if (!otpResult.valid || !otpResult.otp) {
      throw createError.unauthorized('Invalid or expired verification code');
    }

    // Get user
    const user = await authRepository.findUserById(input.userId);
    if (!user) {
      throw createError.notFound('User not found');
    }

    // Update verification status based on OTP method
    if (otpResult.otp.method === 'sms' && !user.isPhoneVerified) {
      await authRepository.verifyUserPhone(user.id);
    } else if (otpResult.otp.method === 'email' && !user.isEmailVerified) {
      await authRepository.verifyUserEmail(user.id);
    }

    // Generate tokens
    const tokens = await generateTokenPair({
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    });

    // Create session
    await authRepository.createSession({
      userId: user.id,
      refreshToken: tokens.refreshToken,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
      expiresAt: getRefreshTokenExpiry(),
    });

    // Invalidate all login OTPs for this user (non-blocking)
    await safeAsync(() => otpService.invalidateUserOtps(user.id, 'login'));

    const safeUser = omit(user, ['password']);

    logger.info({ userId: user.id }, 'User logged in successfully with 2FA');

    return {
      user: await transformEntityImageUrls(safeUser),
      tokens,
    };
  },

  // ============================================
  // Request OTP (for resend)
  // ============================================

  async requestOtp(input: RequestOtpInput): Promise<OtpRequestResponse> {
    const user = await authRepository.findUserById(input.userId);
    if (!user) {
      throw createError.notFound('User not found');
    }

    // Determine delivery method (prefer phone if available and verified)
    let otpMethod: 'email' | 'sms' = 'email';
    let recipient = user.email;

    if (user.phoneNumber && user.isPhoneVerified) {
      otpMethod = 'sms';
      recipient = user.phoneNumber;
    }

    // Create OTP
    const { code, expiresAt } = await otpService.createOtp(
      user.id,
      'login',
      otpMethod,
      recipient
    );

    // Send OTP with graceful fallback
    let otpSent = false;
    try {
      if (otpMethod === 'sms') {
        otpSent = await smsService.sendOtp(recipient, code);
        if (!otpSent) {
          // Fallback to email
          await safeAsync(() => otpService.invalidateUserOtps(user.id, 'login'));
          const emailOtp = await otpService.createOtp(user.id, 'login', 'email', user.email);
          otpSent = await emailService.sendOtpEmail(user.email, emailOtp.code);
          otpMethod = 'email';
          recipient = user.email;
        }
      } else {
        otpSent = await emailService.sendOtpEmail(recipient, code);
      }
    } catch (error) {
      logger.error({ err: error, userId: user.id, method: otpMethod }, 'Failed to send OTP');
      throw createError.email('Failed to send verification code. Please try again.', error instanceof Error ? error : undefined);
    }

    if (!otpSent) {
      throw createError.email('Failed to send verification code. Please try again.');
    }

    return {
      userId: user.id,
      message: `Verification code sent to ${otpMethod === 'sms' ? 'your phone' : 'your email'}.`,
      verificationMethod: otpMethod,
      expiresAt: expiresAt.toISOString(),
    };
  },

  // ============================================
  // Refresh Token
  // ============================================

  async refresh(refreshToken: string): Promise<RefreshResponse> {
    // Verify refresh token
    let payload;
    try {
      payload = await verifyRefreshToken(refreshToken);
    } catch {
      throw createError.unauthorized('Invalid or expired refresh token');
    }

    // Check if session exists
    const session = await authRepository.findSession(refreshToken);
    if (!session) {
      throw createError.unauthorized('Session not found or expired');
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      await authRepository.deleteSession(refreshToken);
      throw createError.unauthorized('Session expired');
    }

    // Get user
    const user = await authRepository.findUserById(payload.sub);
    if (!user) {
      await authRepository.deleteSession(refreshToken);
      throw createError.unauthorized('User not found');
    }

    // Delete old session
    await authRepository.deleteSession(refreshToken);

    // Generate new token pair (token rotation)
    const newTokens = await generateTokenPair({
      sub: user.id,
      email: user.email,
      username: user.username,
      role: user.role,
    });

    // Create new session
    await authRepository.createSession({
      userId: user.id,
      refreshToken: newTokens.refreshToken,
      expiresAt: getRefreshTokenExpiry(),
    });

    return { tokens: newTokens };
  },

  // ============================================
  // Logout
  // ============================================

  async logout(refreshToken: string): Promise<MessageResponse> {
    await authRepository.deleteSession(refreshToken);
    return { message: 'Logged out successfully' };
  },

  // ============================================
  // Logout All Sessions
  // ============================================

  async logoutAll(userId: string): Promise<MessageResponse> {
    await authRepository.deleteUserSessions(userId);
    return { message: 'All sessions terminated successfully' };
  },

  // ============================================
  // Verify Email
  // ============================================

  async verifyEmail(token: string): Promise<MessageResponse> {
    const authToken = await authRepository.findAuthToken(token);

    if (!authToken || authToken.type !== 'email_verification') {
      throw createError.badRequest('Invalid verification token');
    }

    if (authToken.expiresAt < new Date()) {
      await authRepository.deleteAuthToken(authToken.id);
      throw createError.badRequest('Verification token expired');
    }

    if (authToken.usedAt) {
      throw createError.badRequest('Token already used');
    }

    // Verify user email
    await authRepository.verifyUserEmail(authToken.userId);
    await authRepository.markAuthTokenUsed(authToken.id);

    return { message: 'Email verified successfully' };
  },

  // ============================================
  // Resend Verification Email
  // ============================================

  async resendVerificationEmail(email: string): Promise<MessageResponse> {
    const user = await authRepository.findUserByEmail(email);

    if (!user) {
      // Don't reveal if user exists (security best practice)
      throw createError.notFound('If an account with this email exists, a verification email has been sent.');
    }

    // If email is already verified, don't send another verification email
    if (user.isEmailVerified) {
      throw createError.badRequest('Email is already verified');
    }

    // Delete any existing unused verification tokens for this user
    await authRepository.deleteUserAuthTokens(user.id, 'email_verification');

    // Generate new email verification token
    const verificationToken = nanoid(32);
    await authRepository.createAuthToken({
      userId: user.id,
      token: verificationToken,
      type: 'email_verification',
      expiresAt: addTime(new Date(), '24h'),
    });

    // Send verification email
    try {
      await emailService.sendVerificationEmail(user.email, verificationToken);
      logger.info({ userId: user.id, email: user.email }, 'Verification email resent');
    } catch (error) {
      logger.error({
        err: error,
        userId: user.id,
        email: user.email
      }, 'Failed to resend verification email');
      throw createError.email('Failed to send verification email. Please try again.', error instanceof Error ? error : undefined);
    }

    return { message: 'Verification email sent. Please check your inbox.' };
  },

  // ============================================
  // Forgot Password
  // ============================================

  async forgotPassword(email: string): Promise<MessageResponse> {
    const user = await authRepository.findUserByEmail(email);

    // Always return success to prevent email enumeration
    if (!user) {
      return { message: 'If an account exists with this email, you will receive a password reset link.' };
    }

    // Delete any existing password reset tokens
    await authRepository.deleteUserAuthTokens(user.id, 'password_reset');

    // Generate password reset token
    const resetToken = nanoid(32);
    await authRepository.createAuthToken({
      userId: user.id,
      token: resetToken,
      type: 'password_reset',
      expiresAt: addTime(new Date(), '1h'),
    });

    // Send password reset email (with proper error handling)
    logger.info({ to: user.email }, 'Sending password reset email');
    try {
      await emailService.sendPasswordResetEmail(user.email, resetToken);
    } catch (error) {
      // Log error but don't reveal if user exists (security best practice)
      const errorMessage = error instanceof Error ? error.message : String(error);
      const resetUrl = `${config.app.isDev ? 'http://localhost:3000' : 'https://your-universe-ai-frontend-d9gl.vercel.app'}/reset-password?token=${resetToken}`;
      logger.error({
        err: error,
        email: user.email,
        errorMessage,
        ...(config.app.isDev && { resetLink: resetUrl }),
      }, 'Failed to send password reset email');

      if (config.app.isDev) {
        logger.warn(`[DEV] Password reset email failed. Use this link to test: ${resetUrl}`);
      }
      // Still return success message to user (don't reveal if email exists)
      // But log the error for admin/debugging
    }

    return { message: 'If an account exists with this email, you will receive a password reset link.' };
  },

  // ============================================
  // Reset Password
  // ============================================

  async resetPassword(token: string, newPassword: string): Promise<MessageResponse> {
    const authToken = await authRepository.findAuthToken(token);

    if (!authToken || authToken.type !== 'password_reset') {
      throw createError.badRequest('Invalid reset token');
    }

    if (authToken.expiresAt < new Date()) {
      await authRepository.deleteAuthToken(authToken.id);
      throw createError.badRequest('Reset token expired');
    }

    if (authToken.usedAt) {
      throw createError.badRequest('Token already used');
    }

    // Hash new password
    const hashedPassword = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // Update password
    await authRepository.updateUserPassword(authToken.userId, hashedPassword);
    await authRepository.markAuthTokenUsed(authToken.id);

    // Invalidate all sessions
    await authRepository.deleteUserSessions(authToken.userId);

    return { message: 'Password reset successfully. Please login with your new password.' };
  },

  // ============================================
  // Change Password
  // ============================================

  async changePassword(
    userId: string,
    oldPassword: string,
    newPassword: string
  ): Promise<MessageResponse> {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw createError.notFound('User not found');
    }

    // Verify old password
    const isPasswordValid = await argon2.verify(user.password, oldPassword);
    if (!isPasswordValid) {
      throw createError.unauthorized('Current password is incorrect');
    }

    // Hash new password
    const hashedPassword = await argon2.hash(newPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });

    // Update password
    await authRepository.updateUserPassword(userId, hashedPassword);

    // Invalidate all other sessions
    await authRepository.deleteUserSessions(userId);

    return { message: 'Password changed successfully. Please login again.' };
  },

  // ============================================
  // Get User By ID
  // ============================================

  async getUserById(userId: string): Promise<UserWithoutPassword> {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw createError.notFound('User not found');
    }

    const safeUser = omit(user, ['password']);
    return await transformEntityImageUrls(safeUser);
  },

  // ============================================
  // Update Profile
  // ============================================

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

    // If username is being changed, enforce cooldown and availability checks
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

      // Invalidate old username cache
      await safeAsync(() => usernameService.invalidateCache(user.username));
    }

    // Delete old S3 images when replacing
    if (data.avatar !== undefined && data.avatar !== null) {
      const oldAvatar = user.avatar as { url?: string } | null;
      if (oldAvatar?.url) await deleteFromS3IfExists(oldAvatar.url);
    }
    if (data.avatar === null) {
      const oldAvatar = user.avatar as { url?: string } | null;
      if (oldAvatar?.url) await deleteFromS3IfExists(oldAvatar.url);
    }
    if (data.backgroundImg !== undefined && data.backgroundImg !== null) {
      const oldBg = user.backgroundImg as { url?: string } | null;
      if (oldBg?.url) await deleteFromS3IfExists(oldBg.url);
    }
    if (data.backgroundImg === null) {
      const oldBg = user.backgroundImg as { url?: string } | null;
      if (oldBg?.url) await deleteFromS3IfExists(oldBg.url);
    }

    const isUsernameChanged = Boolean(data.username && data.username !== user.username);

    // Update user
    const updatedUser = await authRepository.updateUser(userId, {
      ...data,
      ...(isUsernameChanged ? { usernameChangedAt: new Date() } : {}),
    });

    // Invalidate username cache if username changed
    if (data.username && data.username !== user.username) {
      const newUsername = data.username;
      await safeAsync(() => usernameService.invalidateCache(newUsername));
    }

    const safeUser = omit(updatedUser, ['password']);
    return await transformEntityImageUrls(safeUser);
  },
};

export default authService;
