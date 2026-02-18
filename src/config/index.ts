import { z } from 'zod';

const envSchema = z.object({
    // Application
    NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
    PORT: z.string().default('8000'),
    HOST: z.string().default('localhost'),
    API_VERSION: z.string().default('v1'),
    APP_NAME: z.string().default('youruniverse-api'),

    // Database
    DATABASE_URL: z.string(),

    // Redis
    REDIS_URL: z.string().optional(),

    // JWT
    JWT_ACCESS_SECRET: z.string(),
    JWT_REFRESH_SECRET: z.string(),
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
    UPLOAD_ALLOWED_TYPES: z.string().default('image/jpeg,image/png,image/webp,image/gif'),
    UPLOAD_DIR: z.string().default('./uploads'),

    // Rate Limiting
    RATE_LIMIT_WINDOW_MS: z.string().default('60000'),
    RATE_LIMIT_MAX_REQUESTS: z.string().default('100'),
    RATE_LIMIT_AUTH_MAX_REQUESTS: z.string().default('5'),

    // CORS
    CORS_ORIGIN: z.string().default('http://localhost:3000'),
    CORS_CREDENTIALS: z.string().default('true'),

    // Python Microservice
    PYTHON_CHAT_SERVICE_URL: z.string().optional(),

    // MFA
    OTP_SECRET: z.string().optional(),
    OTP_ISSUER: z.string().default('youruniverse.ai'),

    // AWS S3
    AWS_ACCESS_KEY_ID: z.string().optional(),
    AWS_SECRET_ACCESS_KEY: z.string().optional(),
    AWS_REGION: z.string().optional(),
    AWS_S3_BUCKET: z.string().optional(),
    AWS_S3_ENDPOINT: z.string().optional(), // For S3-compatible services (e.g., DigitalOcean Spaces)
    AWS_S3_CDN_URL: z.string().optional(), // CDN URL for public access (e.g., CloudFront)

    // Mem0 Memory (optional - graceful degradation when not configured)
    MEM0_ENABLED: z.string().optional().transform((v) => v === 'true' || v === '1'),
    QDRANT_HOST: z.string().optional(),
    QDRANT_PORT: z.string().optional(),
    QDRANT_URL: z.string().optional(),
    QDRANT_API_KEY: z.string().optional(),
    MEM0_COLLECTION_NAME: z.string().optional(),
    MEM0_EMBEDDING_DIMS: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    GEMINI_API_KEY: z.string().optional(),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
    console.error('❌ Invalid environment variables:', parsedEnv.error.flatten().fieldErrors);
    process.exit(1);
}

const env = parsedEnv.data;

export const config = {
    app: {
        env: env.NODE_ENV,
        port: parseInt(env.PORT, 10),
        host: env.HOST,
        apiVersion: env.API_VERSION,
        name: env.APP_NAME,
        isDev: env.NODE_ENV === 'development',
        isProd: env.NODE_ENV === 'production',
        isTest: env.NODE_ENV === 'test',
    },

    database: {
        url: env.DATABASE_URL,
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
        allowedTypes: env.UPLOAD_ALLOWED_TYPES.split(','),
        dir: env.UPLOAD_DIR,
    },

    rateLimit: {
        windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
        maxRequests: parseInt(env.RATE_LIMIT_MAX_REQUESTS, 10),
        authMaxRequests: parseInt(env.RATE_LIMIT_AUTH_MAX_REQUESTS, 10),
    },

    cors: {
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

    aws: {
        accessKeyId: env.AWS_ACCESS_KEY_ID,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
        region: env.AWS_REGION || 'us-east-1',
        s3: {
            bucket: env.AWS_S3_BUCKET,
            endpoint: env.AWS_S3_ENDPOINT,
            cdnUrl: env.AWS_S3_CDN_URL,
        },
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
        geminiApiKey: env.GEMINI_API_KEY,
        openaiApiKey: env.OPENAI_API_KEY,
    },
} as const;

export type Config = typeof config;

