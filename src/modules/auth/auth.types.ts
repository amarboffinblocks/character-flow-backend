import type { User } from '@prisma/client';
import type { SafeUser, TokenPair } from '../../types/index.js';

// ============================================
// Request/Response DTOs
// ============================================

export interface RegisterInput {
  name: string;
  username: string;
  email: string;
  phoneNumber?: string;
  password: string;
}

export interface LoginInput {
  identifier: string; // phone, email, or username
  password: string;
}

export interface RefreshInput {
  refreshToken: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export interface ChangePasswordInput {
  oldPassword: string;
  newPassword: string;
  mfaCode?: string;
}

export interface VerifyEmailInput {
  token: string;
}

export interface MfaVerifyInput {
  code: string;
  userId: string;
}

export interface RequestOtpInput {
  userId: string;
}

export interface VerifyOtpInput {
  userId: string;
  code: string;
}

// ============================================
// Response Types
// ============================================

export interface AuthResponse {
  user: SafeUser;
  tokens: TokenPair;
}

export interface RegisterResponse {
  user: SafeUser;
  message: string;
}

export interface LoginResponse extends AuthResponse {}

export interface RefreshResponse {
  tokens: TokenPair;
}

export interface MessageResponse {
  message: string;
}

export interface OtpRequestResponse {
  userId: string;
  message: string;
  verificationMethod: 'sms' | 'email';
  expiresAt: string;
}

export interface OtpVerifyResponse {
  message: string;
  tokens?: TokenPair;
}

// ============================================
// Internal Types
// ============================================

export interface TokenData {
  userId: string;
  type: 'email_verification' | 'password_reset' | 'mfa';
  expiresAt: Date;
}

export interface CreateUserData {
  name: string;
  username: string;
  email: string;
  phoneNumber?: string;
  password: string;
}

export interface SessionData {
  userId: string;
  refreshToken: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
}

export type UserWithoutPassword = Omit<User, 'password'>;

