import 'dotenv/config';
import { createApp } from './app.js';
import { config } from './config/index.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';
import { closeRedis } from './lib/redis.js';

// ============================================
// Main Entry Point
// ============================================

const main = async (): Promise<void> => {
  try {
    // Connect to database
    logger.info('Connecting to database...');
    await prisma.$connect();
    logger.info('Database connected');

    // Create and start server
    const app = await createApp();

    const server = app.listen(config.app.port, config.app.host, () => {
      logger.info(`🚀 Server running on http://${config.app.host}:${config.app.port}`);
      logger.info(`📚 API Version: ${config.app.apiVersion}`);
      logger.info(`🌍 Environment: ${config.app.env}`);
    });

    // ============================================
    // Graceful Shutdown
    // ============================================

    const shutdown = async (signal: string): Promise<void> => {
      logger.info(`\n${signal} received. Shutting down gracefully...`);

      server.close(async () => {
        logger.info('HTTP server closed');

        // Close database connection
        await prisma.$disconnect();
        logger.info('Database disconnected');

        // Close Redis connection
        await closeRedis();

        logger.info('Shutdown complete');
        process.exit(0);
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 30000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // ============================================
    // Unhandled Errors
    // ============================================

    process.on('unhandledRejection', (reason: unknown) => {
      logger.error({ reason }, 'Unhandled Rejection');
    });

    process.on('uncaughtException', (error: Error) => {
      logger.error({ err: error }, 'Uncaught Exception');
      process.exit(1);
    });

  } catch (error) {
    logger.error({ err: error }, 'Failed to start server');
    process.exit(1);
  }
};

main();

