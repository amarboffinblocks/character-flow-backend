import nodemailer from 'nodemailer';
import { config } from '../config/index.js';
import { logger } from './logger.js';

// ============================================
// Email Service
// ============================================

let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize email transporter
 */
const getTransporter = (): nodemailer.Transporter | null => {
  if (!config.email.host || !config.email.user || !config.email.pass) {
    logger.warn('Email configuration incomplete. Email sending disabled.');
    return null;
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port ?? 587,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  }

  return transporter;
};

export const emailService = {
  /**
   * Send email
   * @throws {Error} If email configuration is invalid or sending fails
   */
  async sendEmail(options: {
    to: string;
    subject: string;
    html: string;
    text?: string;
    attachments?: { filename: string; content?: Buffer | string; path?: string; contentType?: string }[];
  }): Promise<boolean> {
    const mailTransporter = getTransporter();

    if (!mailTransporter) {
      // In development, log email instead of sending
      if (config.app.isDev) {
        logger.info(
          {
            to: options.to,
            subject: options.subject,
            preview: options.text || options.html.substring(0, 100),
          },
          '📧 Email would be sent (Development Mode)'
        );
        return true;
      }

      // In production, throw error if email is not configured
      const error = new Error('Email service not configured. Please check SMTP settings.');
      logger.error({
        to: options.to,
        error: error.message,
        config: {
          host: config.email.host ? 'set' : 'missing',
          user: config.email.user ? 'set' : 'missing',
          port: config.email.port,
        }
      }, 'Email service not configured');
      throw error;
    }

    try {
      // Verify connection before sending
      await mailTransporter.verify();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error({
        err: error,
        to: options.to,
        smtp: {
          host: config.email.host,
          port: config.email.port,
          user: config.email.user,
        }
      }, 'SMTP connection verification failed');

      throw new Error(`SMTP connection failed: ${errorMessage}. Please check your email configuration.`);
    }

    try {
      const mailOptions = {
        from: config.email.from || config.email.user,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      };

      const info = await mailTransporter.sendMail(mailOptions);
      logger.info({ messageId: info.messageId, to: options.to }, 'Email sent successfully');
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as { code?: string })?.code;

      logger.error({
        err: error,
        to: options.to,
        errorCode,
        smtp: {
          host: config.email.host,
          port: config.email.port,
        }
      }, 'Failed to send email');

      // Provide more specific error messages
      if (errorCode === 'EAUTH') {
        throw new Error(`SMTP authentication failed. Please check your email username and password.`);
      } else if (errorCode === 'ETIMEDOUT' || errorCode === 'ECONNREFUSED') {
        throw new Error(`Cannot connect to SMTP server at ${config.email.host}:${config.email.port}. Please check your email configuration.`);
      } else {
        throw new Error(`Failed to send email: ${errorMessage}`);
      }
    }
  },

  /**
   * Send email verification link
   */
  async sendVerificationEmail(email: string, token: string): Promise<boolean> {
    const verificationUrl = `${config.app.isDev ? 'http://localhost:3000' : 'https://your-universe-ai-frontend-d9gl.vercel.app'}/verify/email/${token}`;

    return this.sendEmail({
      to: email,
      subject: 'Verify Your youruniverse.ai Account',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">youruniverse.ai</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">Verify Your Email Address</h2>
            <p>Thank you for registering with youruniverse.ai!</p>
            <p>Please click the button below to verify your email address:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" target="_blank" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
            </div>
            <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="font-size: 12px; word-break: break-all;"><a href="${verificationUrl}" target="_blank" style="color: #667eea; text-decoration: none;">${verificationUrl}</a></p>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">This link will expire in 24 hours.</p>
            <p style="color: #666; font-size: 14px;">If you didn't create an account, please ignore this email.</p>
          </div>
        </body>
        </html>
      `,
      text: `Verify your youruniverse.ai account by visiting: ${verificationUrl}`,
    });
  },

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    const resetUrl = `${config.app.isDev ? 'http://localhost:3000' : 'https://your-universe-ai-frontend-d9gl.vercel.app/'}/reset-password?token=${token}`;

    return this.sendEmail({
      to: email,
      subject: 'Reset Your youruniverse.ai Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">youruniverse.ai</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">Reset Your Password</h2>
            <p>You requested to reset your password for youruniverse.ai.</p>
            <p>Click the button below to reset your password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" target="_blank" style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
            </div>
            <p style="color: #666; font-size: 14px;">Or copy and paste this link into your browser:</p>
            <p style="font-size: 12px; word-break: break-all;"><a href="${resetUrl}" target="_blank" style="color: #667eea; text-decoration: none;">${resetUrl}</a></p>
            <p style="color: #666; font-size: 14px; margin-top: 30px;">This link will expire in 1 hour.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request a password reset, please ignore this email.</p>
          </div>
        </body>
        </html>
      `,
      text: `Reset your password by visiting: ${resetUrl}`,
    });
  },

  /**
   * Send OTP via email
   */
  async sendOtpEmail(email: string, code: string): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: 'Your youruniverse.ai Verification Code',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">youruniverse.ai</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333;">Your Verification Code</h2>
            <p>You're logging in to youruniverse.ai. Use this code to complete your login:</p>
            <div style="background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 30px 0; border-radius: 5px;">
              <h1 style="color: #667eea; font-size: 36px; letter-spacing: 5px; margin: 0;">${code}</h1>
            </div>
            <p style="color: #666; font-size: 14px;">This code will expire in 5 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email or contact support.</p>
          </div>
        </body>
        </html>
      `,
      text: `Your youruniverse.ai verification code is: ${code}. Valid for 5 minutes.`,
    });
  },

  /**
   * Send feature request or bug report to admin
   */
  async sendFeatureRequestEmail(data: {
    title: string;
    priority: string;
    category: string;
    platform: string;
    operatingSystem?: string;
    description: string;
    additionalDetails?: string;
    requesterUsername: string;
    requesterEmail: string;
    attachments?: { filename: string; content: Buffer; contentType: string }[];
  }): Promise<boolean> {
    const adminEmail = config.email.user || ''; // Send to the configured system admin email
    const subjectPrefix = data.category === 'Bug Report' ? '[BUG REPORT]' : '[FEATURE REQUEST]';

    return this.sendEmail({
      to: adminEmail,
      subject: `${subjectPrefix} - ${data.title} (${data.priority.toUpperCase()})`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">New Submission Received</h1>
          </div>
          <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; border-bottom: 2px solid #ddd; padding-bottom: 10px;">Submission Details</h2>
            <p><strong>Title:</strong> ${data.title}</p>
            <p><strong>Requester:</strong> ${data.requesterUsername} (<a href="mailto:${data.requesterEmail}">${data.requesterEmail}</a>)</p>
            <p><strong>Priority:</strong> <span style="background: #eee; padding: 3px 8px; border-radius: 4px;">${data.priority}</span></p>
            <p><strong>Category:</strong> ${data.category}</p>
            <p><strong>Platform:</strong> ${data.platform}</p>
            ${data.operatingSystem ? `<p><strong>Operating System:</strong> ${data.operatingSystem}</p>` : ''}
            
            <h3 style="margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Description</h3>
            <div style="background: #fff; padding: 15px; border-left: 4px solid #1e3c72; border-radius: 4px; white-space: pre-wrap;">${data.description}</div>
            
            ${data.additionalDetails ? `
              <h3 style="margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 5px;">Additional Details</h3>
              <div style="background: #fff; padding: 15px; border-left: 4px solid #666; border-radius: 4px; white-space: pre-wrap;">${data.additionalDetails}</div>
            ` : ''}
          </div>
        </body>
        </html>
      `,
      text: `New Submission: ${data.title}\nRequester: ${data.requesterUsername} (${data.requesterEmail})\nPriority: ${data.priority}\nCategory: ${data.category}\nPlatform: ${data.platform}\n\nDescription:\n${data.description}`,
      attachments: data.attachments,
    });
  },
};

export default emailService;

