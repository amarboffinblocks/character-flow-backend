import { z } from 'zod';

const envSchema = z.object({
    // Application
    NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
    PORT: z.string().default('8000'),
    HOST: z.string().default('localhost'),
    API_VERSION: z.string().default('v1'),
    APP_NAME: z.string().default('youruniverse-api'),

    // Database — DATABASE_URL: Supabase pooler (6543) or direct Postgres; DIRECT_URL: direct 5432 for migrations
    DATABASE_URL: z.string(),
    DIRECT_URL: z.string(),

    // Open access: single shared guest row for instant login
    DEFAULT_USER_EMAIL: z.string().email().default('guest@localhost.local'),
    DEFAULT_USER_USERNAME: z.string().min(1).default('guest'),
    DEFAULT_USER_NAME: z.string().min(1).default('Guest'),

    // Redis
    REDIS_URL: z.string().optional(),

    // JWT (unused — kept optional for legacy .env compatibility)
    JWT_ACCESS_SECRET: z.string().optional().default('unused'),
    JWT_REFRESH_SECRET: z.string().optional().default('unused'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),

    // Email
    SMTP_HOST: z.string().optional(),
    SMTP_PORT: z.string().optional(),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    SMTP_FROM: z.string().optional(),

    // File Upload
    UPLOAD_MAX_SIZE: z.string().default('10485760'),
    /** Max size for character/persona/lorebook import files (bytes). Default 50MB. */
    IMPORT_MAX_SIZE: z.string().optional().default('52428800'),
    UPLOAD_ALLOWED_TYPES: z.string().default('image/jpeg,image/png,image/webp,image/gif'),
    UPLOAD_DIR: z.string().default('./uploads'),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.string().default('60000'),
    RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
    RATE_LIMIT_AUTH_MAX_REQUESTS: z.string().default('5'),

    // CORS (comma-separated for multiple origins, or * for all)
    CORS_ORIGIN: z.string().default('http://localhost:3000'),
    CORS_CREDENTIALS: z.string().default('true'),

    // Python Microservice
    PYTHON_CHAT_SERVICE_URL: z.string().optional(),

    // MFA
    OTP_SECRET: z.string().optional(),
    OTP_ISSUER: z.string().default('youruniverse.ai'),

    // Cloudinary (images — required for uploads when not using local-only paths in dev)
    CLOUDINARY_CLOUD_NAME: z.string().optional(),
    CLOUDINARY_API_KEY: z.string().optional(),
    CLOUDINARY_API_SECRET: z.string().optional(),

    // AI Pipeline (optional - character chat enhancements)
    AI_PREPROCESSING_ENABLED: z.string().optional().transform((v) => v !== 'false' && v !== '0'),
    AI_POSTPROCESSING_ENABLED: z.string().optional().transform((v) => v !== 'false' && v !== '0'),
    AI_SAFETY_BLOCKED_WORDS: z.string().optional(),
    AI_GUARDRAIL_BLOCKED_PHRASES: z.string().optional(),


    // AI provider keys (used by chat provider.ts)
    OPENAI_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),

    // Mem0 Memory (optional - graceful degradation when not configured)
    MEM0_ENABLED: z.string().optional().transform((v) => v === 'true' || v === '1'),
    QDRANT_HOST: z.string().optional(),
    QDRANT_PORT: z.string().optional(),
    QDRANT_URL: z.string().optional(),
    QDRANT_API_KEY: z.string().optional(),
    MEM0_COLLECTION_NAME: z.string().optional(),
    MEM0_EMBEDDING_DIMS: z.string().optional(),

    // Custom hosted models for memory (required when MEM0_ENABLED=true)
    CUSTOM_EMBEDDING_BASE_URL: z.string().optional(),
    CUSTOM_EMBEDDING_MODEL: z.string().optional(),
    CUSTOM_LLM_BASE_URL: z.string().optional(),
    CUSTOM_LLM_MODEL: z.string().optional(),

    // Memory management tuning
    MEMORY_SCORE_THRESHOLD: z.string().optional(),
    MEMORY_TIME_DECAY_FACTOR: z.string().optional(),
    MEMORY_MAX_AGE_DAYS: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
    console.error('❌ Invalid environment variables:', parsedEnv.error.flatten().fieldErrors);
    process.exit(1);
}

const env = parsedEnv.data;
const resolvedNodeEnv = env.NODE_ENV ?? (process.env.VERCEL === '1' ? 'production' : 'development');

export const config = {
    app: {
        env: resolvedNodeEnv,
        port: parseInt(env.PORT, 10),
        host: env.HOST,
        apiVersion: env.API_VERSION,
        name: env.APP_NAME,
        isDev: resolvedNodeEnv === 'development',
        isProd: resolvedNodeEnv === 'production',
        isTest: resolvedNodeEnv === 'test',
    },

    database: {
        url: env.DATABASE_URL,
        directUrl: env.DIRECT_URL,
    },

    auth: {
        defaultUserEmail: env.DEFAULT_USER_EMAIL,
        defaultUsername: env.DEFAULT_USER_USERNAME,
        defaultUserName: env.DEFAULT_USER_NAME,
    },

    redis: {
        url: env.REDIS_URL,
    },

    jwt: {
        accessSecret: env.JWT_ACCESS_SECRET,
        refreshSecret: env.JWT_REFRESH_SECRET,
        accessExpiresIn: env.JWT_ACCESS_EXPIRES_IN,
        refreshExpiresIn: env.JWT_REFRESH_EXPIRES_IN,
    },

    email: {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT ? parseInt(env.SMTP_PORT, 10) : undefined,
        user: env.SMTP_USER,
        pass: env.SMTP_PASS,
        from: env.SMTP_FROM,
    },

    upload: {
        maxSize: parseInt(env.UPLOAD_MAX_SIZE, 10),
        /** Max file size for character/persona/lorebook imports (default 50MB). */
        importMaxSize: parseInt(env.IMPORT_MAX_SIZE, 10),
        allowedTypes: env.UPLOAD_ALLOWED_TYPES.split(','),
        dir: env.UPLOAD_DIR,
    },

    rateLimit: {
        windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
        maxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10),
        authMaxRequests: parseInt(env.RATE_LIMIT_AUTH_MAX_REQUESTS, 10),
    },

    cors: {
        /** Array of allowed origins, or ['*'] for allow-all (cannot use * with credentials) */
        origin: env.CORS_ORIGIN,
        credentials: env.CORS_CREDENTIALS === 'true',
    },

    services: {
        pythonChat: env.PYTHON_CHAT_SERVICE_URL,
    },

    mfa: {
        secret: env.OTP_SECRET,
        issuer: env.OTP_ISSUER,
    },

    cloudinary: {
        cloudName: env.CLOUDINARY_CLOUD_NAME,
        apiKey: env.CLOUDINARY_API_KEY,
        apiSecret: env.CLOUDINARY_API_SECRET,
    },

    ai: {
        preprocessingEnabled: env.AI_PREPROCESSING_ENABLED ?? true,
        postprocessingEnabled: env.AI_POSTPROCESSING_ENABLED ?? true,
        safetyBlockedWords: env.AI_SAFETY_BLOCKED_WORDS?.split(',').map((w) => w.trim().toLowerCase()).filter(Boolean) ?? ['kill', 'bomb', 'suicide', 'self-harm'],
        guardrailBlockedPhrases: env.AI_GUARDRAIL_BLOCKED_PHRASES?.split(',').map((p) => p.trim().toLowerCase()).filter(Boolean) ?? ['as an ai', 'language model', 'openai', 'i am an ai', 'i\'m an ai'],
    },

    memory: {
        enabled: env.MEM0_ENABLED ?? false,
        qdrant: {
            host: env.QDRANT_HOST || 'localhost',
            port: env.QDRANT_PORT ? parseInt(env.QDRANT_PORT, 10) : 6333,
            url: env.QDRANT_URL,
            apiKey: env.QDRANT_API_KEY,
        },
        collectionName: env.MEM0_COLLECTION_NAME || 'youruniverse_memories',
        embeddingDims: env.MEM0_EMBEDDING_DIMS ? parseInt(env.MEM0_EMBEDDING_DIMS, 10) : 768,
        embeddingBaseUrl: env.CUSTOM_EMBEDDING_BASE_URL,
        embeddingModel: env.CUSTOM_EMBEDDING_MODEL,
        llmBaseUrl: env.CUSTOM_LLM_BASE_URL,
        llmModel: env.CUSTOM_LLM_MODEL,
        scoreThreshold: env.MEMORY_SCORE_THRESHOLD ? parseFloat(env.MEMORY_SCORE_THRESHOLD) : 0.3,
        timeDecayFactor: env.MEMORY_TIME_DECAY_FACTOR ? parseFloat(env.MEMORY_TIME_DECAY_FACTOR) : 0.0005,
        maxAgeDays: env.MEMORY_MAX_AGE_DAYS ? parseInt(env.MEMORY_MAX_AGE_DAYS, 10) : 30,
    },
} as const;

export type Config = typeof config;

