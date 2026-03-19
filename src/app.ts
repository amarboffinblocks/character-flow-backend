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

  // CORS — use CORS_ORIGIN from config (comma-separated in production)
  const allowedOrigins = config.cors.allowedOrigins;
  const allowAllOrigins = allowedOrigins.includes('*');
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (same-origin, server-to-server, or proxy may strip it)
      if (!origin) {
        return callback(null, true);
      }
      if (allowAllOrigins || allowedOrigins.includes(origin)) {
        return callback(null, origin);
      }
      logger.warn({ origin, allowedOrigins }, 'CORS: origin not allowed');
      callback(new Error('Not allowed by CORS'), false);
    },
    credentials: config.cors.credentials,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Idempotency-Key',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
    exposedHeaders: ['Content-Type', 'Authorization', 'X-User-Message-Id'],
    maxAge: 86400,
    optionsSuccessStatus: 204,
    preflightContinue: false,
  }));

  // ============================================
  // General Middleware
  // ============================================

  // Compression middleware - skip SSE/streaming responses
  app.use(compression({
    filter: (req, res) => {
      // Don't compress chat message stream (POST to /chats/:id/messages or /realms/:id/chats/:id/messages returns SSE)
      const isChatStream =
        req.method === 'POST' &&
        (/\/api\/v1\/chats\/[^/]+\/messages$/.test(req.path) ||
          /\/api\/v1\/realms\/[^/]+\/chats\/[^/]+\/messages$/.test(req.path));
      if (isChatStream) {
        return false;
      }
      // Don't compress other SSE responses
      const isSSE = req.query.stream === 'true' || req.headers.accept?.includes('text/event-stream');
      if (isSSE) {
        return false;
      }
      return compression.filter(req, res);
    },
  }));
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));
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
    // Skip logging OPTIONS requests (CORS preflight) to reduce log noise
    if (req.method === 'OPTIONS') {
      return next();
    }

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
  // Trust Proxy (for rate limiting behind reverse proxy/ngrok)
  // ============================================

  // Always trust proxy when behind ngrok or in production
  app.set('trust proxy', 1);

  // ============================================
  // Swagger API Documentation (before API routes to avoid conflicts)
  // ============================================

  try {
    const { setupSwagger } = await import('./lib/swagger.js');
    setupSwagger(app);
    logger.info('✅ Swagger documentation initialized');
  } catch (error) {
    logger.error({ error }, '❌ Swagger setup failed, continuing without API docs');
    // Log the full error for debugging
    if (error instanceof Error) {
      logger.error({ stack: error.stack }, 'Swagger setup error details');
    }
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
