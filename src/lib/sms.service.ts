import { config } from '../config/index.js';
import { logger } from './logger.js';

// ============================================
// SMS Service
// ============================================

/**
 * SMS Service for sending OTP codes
 * 
 * Production Implementation:
 * - Integrate with Twilio, AWS SNS, or similar SMS provider
 * - Store credentials securely in environment variables
 * - Implement retry logic and error handling
 * - Track delivery status
 */

export const smsService = {
  /**
   * Send OTP via SMS
   * @param phoneNumber - Phone number in E.164 format (e.g., +1234567890)
   * @param code - 6-digit OTP code
   * @returns Promise<boolean> - Success status
   */
  async sendOtp(phoneNumber: string, code: string): Promise<boolean> {
    try {
      // Validate phone number format (E.164)
      if (!this.isValidPhoneNumber(phoneNumber)) {
        logger.error({ phoneNumber }, 'Invalid phone number format');
        return false;
      }

      // In development, log the OTP instead of sending
      if (config.app.isDev) {
        logger.info(
          {
            phoneNumber: phoneNumber.substring(0, 4) + '***',
            code,
            message: 'SMS OTP (Development Mode)',
          },
          '📱 SMS OTP would be sent'
        );
        return true;
      }

      // Production: Integrate with SMS provider
      // Example with Twilio:
      /*
      const twilio = require('twilio');
      const client = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );

      const message = await client.messages.create({
        body: `Your youruniverse.ai verification code is: ${code}. Valid for 5 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phoneNumber,
      });

      logger.info({ messageSid: message.sid, phoneNumber }, 'SMS OTP sent');
      return true;
      */

      // Placeholder for production
      logger.warn('SMS service not configured. Please integrate with SMS provider.');
      return false;
    } catch (error) {
      logger.error({ err: error, phoneNumber }, 'Failed to send SMS OTP');
      return false;
    }
  },

  /**
   * Validate phone number format (E.164)
   */
  isValidPhoneNumber(phoneNumber: string): boolean {
    // E.164 format: +[country code][number]
    // Example: +1234567890, +919876543210
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  },

  /**
   * Format phone number to E.164
   */
  formatPhoneNumber(phoneNumber: string): string | null {
    // Remove all non-digit characters except +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');

    // If doesn't start with +, assume default country code
    if (!cleaned.startsWith('+')) {
      // You can set a default country code here
      // For now, return null to require explicit country code
      return null;
    }

    if (this.isValidPhoneNumber(cleaned)) {
      return cleaned;
    }

    return null;
  },
};

export default smsService;

