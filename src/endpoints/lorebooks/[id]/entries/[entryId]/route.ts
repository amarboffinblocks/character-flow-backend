import type { Request, Response } from 'express';
import { lorebookService, updateLorebookEntrySchema } from '../../../../../modules/lorebook/index.js';
import { sendSuccess } from '../../../../../utils/response.js';
import { requireCurrentUser } from '../../../../../middleware/auth.middleware.js';

// ============================================
// PUT /api/v1/lorebooks/:id/entries/:entryId - Update Entry
// ============================================

export const PUT = async (req: Request, res: Response): Promise<void> => {
  const { entryId } = req.params;
  if (!entryId) {
    throw new Error('Entry ID is required');
  }
  const user = requireCurrentUser(req);
  
  // Validate request body
  const validatedData = updateLorebookEntrySchema.parse(req.body);
  
  // Update entry
  const result = await lorebookService.updateEntry(entryId, user.id, validatedData);
  
  sendSuccess(res, result, 'Entry updated successfully');
};

// ============================================
// DELETE /api/v1/lorebooks/:id/entries/:entryId - Delete Entry
// ============================================

export const DELETE = async (req: Request, res: Response): Promise<void> => {
  const { entryId } = req.params;
  if (!entryId) {
    throw new Error('Entry ID is required');
  }
  const user = requireCurrentUser(req);
  
  // Delete entry
  const result = await lorebookService.deleteEntry(entryId, user.id);
  
  sendSuccess(res, result, result.message);
};

