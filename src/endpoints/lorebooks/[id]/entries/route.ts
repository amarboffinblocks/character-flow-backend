import type { Request, Response } from 'express';
import { lorebookService, createLorebookEntrySchema } from '../../../../modules/lorebook/index.js';
import { sendSuccess } from '../../../../utils/response.js';
import { requireCurrentUser } from '../../../../middleware/auth.middleware.js';

// ============================================
// GET /api/v1/lorebooks/:id/entries - List Entries
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Lorebook ID is required');
  }
  const user = requireCurrentUser(req);
  
  const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
  const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
  
  const result = await lorebookService.getEntries(id, user.id, page, limit);
  sendSuccess(res, result, 'Entries retrieved successfully');
};

// ============================================
// POST /api/v1/lorebooks/:id/entries - Create Entry
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Lorebook ID is required');
  }
  const user = requireCurrentUser(req);
  
  // Validate request body
  const validatedData = createLorebookEntrySchema.parse(req.body);
  
  // Create entry
  const result = await lorebookService.createEntry(id, user.id, validatedData);
  
  sendSuccess(res, result, 'Entry created successfully', 201);
};

