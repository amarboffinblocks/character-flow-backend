import type { Request, Response } from 'express';
import { chatService } from '../../../../modules/chat/index.js';
import { sendSuccess } from '../../../../utils/response.js';
import { requireCurrentUser } from '../../../../middleware/auth.middleware.js';

// ============================================
// POST /api/v1/chats/:id/duplicate - Duplicate Chat
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) {
    throw new Error('Chat ID is required');
  }
  const user = requireCurrentUser(req);

  const result = await chatService.duplicateChat(id, user.id);
  sendSuccess(res, result, 'Chat duplicated successfully', 201);
};
