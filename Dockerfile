# ============================================
# Stage 1: Dependencies
# ============================================
FROM node:20-alpine AS deps

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY package.json package-lock.json ./
# Use npm ci if package-lock.json exists, otherwise fallback to npm install
RUN if [ -f package-lock.json ]; then npm ci --only=production; else npm install --only=production; fi

# ============================================
# Stage 2: Builder
# ============================================
FROM node:20-alpine AS builder

RUN apk add --no-cache libc6-compat openssl

WORKDIR /app

COPY package.json package-lock.json ./
# Use npm ci if package-lock.json exists, otherwise fallback to npm install
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Build TypeScript
RUN npm run build

# ============================================
# Stage 3: Runner
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Create non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 appuser

# Copy necessary files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/prisma ./prisma

# Create uploads directory
RUN mkdir -p uploads/characters && \
    chown -R appuser:nodejs uploads

# Set ownership
RUN chown -R appuser:nodejs /app

USER appuser

# Railway uses PORT environment variable automatically
EXPOSE 8000

ENV NODE_ENV=production
ENV PORT=8000
ENV HOST=0.0.0.0

# Run database migrations and start server
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]

