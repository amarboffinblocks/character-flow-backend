import type { Request, Response } from 'express';
import { sendSuccess } from '../utils/response.js';

// ============================================
// GET /api/v1 - Health Check / API Info
// ============================================

export const GET = async (_req: Request, res: Response): Promise<void> => {
  sendSuccess(res, {
    name: 'youruniverse.ai API',
    version: 'v1',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    documentation: '/api/v1/docs',
  }, 'Welcome to youruniverse.ai API');
};

