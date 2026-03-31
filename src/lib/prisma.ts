import { PrismaClient } from '@prisma/client';
import { config } from '../config/index.js';
import { logger } from './logger.js';

/**
 * Prisma Client Singleton with connection pooling and error handling
 * Optimized for production with proper connection management
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const createPrismaClient = (): PrismaClient => {
  return new PrismaClient({
    log: config.app.isDev
      ? [
          { level: 'query', emit: 'event' },
          { level: 'error', emit: 'stdout' },
          { level: 'warn', emit: 'stdout' },
        ]
      : [{ level: 'error', emit: 'stdout' }],
    errorFormat: 'pretty',
    datasources: {
      db: {
        url: config.database.url,
      },
    },
  });
};

export const prisma =
  globalForPrisma.prisma ?? createPrismaClient();

// Log slow queries in development
if (config.app.isDev && prisma.$on) {
  prisma.$on('query' as never, (e: { query: string; duration: number }) => {
    if (e.duration > 1000) {
      logger.warn({ query: e.query, duration: `${e.duration}ms` }, 'Slow query detected');
    }
  });
}

// Graceful shutdown handler (long-running Node servers; no-op harm on serverless)
const gracefulShutdown = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info('Prisma client disconnected gracefully');
  } catch (error) {
    logger.error({ err: error }, 'Error disconnecting Prisma client');
  }
};

process.on('beforeExit', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

globalForPrisma.prisma = prisma;

export default prisma;

