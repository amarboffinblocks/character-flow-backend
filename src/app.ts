import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { createFileRouter } from './lib/router.js';
import { 
  errorHandler, 
  notFoundHandler, 
  redisGeneralRateLimiter,
  idempotencyMiddleware,
} from './middleware/index.js';
import { logger, getRedis, isRedisConnected } from './lib/index.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================
// Create Express App
// ============================================

export const createApp = async (): Promise<express.Application> => {
  const app = express();

  // ============================================
  // Security Middleware
  // ============================================

  app.use(helmet({
    contentSecurityPolicy: config.app.isProd,
  }));

  app.use(cors({
    origin: config.cors.origin,
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Idempotency-Key'],
  }));

  // ============================================
  // General Middleware
  // ============================================

  app.use(compression());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // ============================================
  // Initialize Redis Connection
  // ============================================

  const redis = getRedis();
  if (redis && isRedisConnected()) {
    logger.info('✅ Redis client initialized and connected');
  } else if (redis) {
    logger.warn('⚠️  Redis client initialized but not connected');
  }

  // ============================================
  // Rate Limiting (Redis-based)
  // ============================================

  app.use(redisGeneralRateLimiter);

  // ============================================
  // Idempotency Middleware (for POST/PUT/PATCH)
  // ============================================

  app.use(idempotencyMiddleware);

  // ============================================
  // Request Logging
  // ============================================

  app.use((req, res, next) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info({
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip,
      });
    });

    next();
  });

  // ============================================
  // Trust Proxy (for rate limiting behind reverse proxy)
  // ============================================

  if (config.app.isProd) {
    app.set('trust proxy', 1);
  }

  // ============================================
  // API Routes (File-Based Routing)
  // ============================================

  const endpointsDir = join(__dirname, 'endpoints');
  const apiRouter = await createFileRouter(endpointsDir, `/api/${config.app.apiVersion}`);

  app.use(`/api/${config.app.apiVersion}`, apiRouter);

  // ============================================
  // Health Check (outside versioned API)
  // ============================================

  app.get('/health', async (_req, res) => {
    const redisStatus = isRedisConnected() ? 'connected' : (redis ? 'disconnected' : 'not configured');
    
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      services: {
        database: 'connected',
        redis: redisStatus,
      },
    });
  });

  // ============================================
  // Error Handling
  // ============================================

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export default createApp;
