import type { Request, Response } from 'express';
import { chatService, updateChatSchema } from '../../../modules/chat/index.js';
import { sendSuccess } from '../../../utils/response.js';
import { requireCurrentUser } from '../../../middleware/auth.middleware.js';

// ============================================
// GET /api/v1/chats/:id - Get Chat (optional ?messages=1 to include messages)
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) throw new Error('Chat ID is required');
  const user = requireCurrentUser(req);
  const includeMessages = req.query.messages === '1' || req.query.messages === 'true';
  const result = await chatService.getChatById(id, user.id, { includeMessages });
  sendSuccess(res, result, 'Chat retrieved successfully');
};

// ============================================
// PATCH /api/v1/chats/:id - Update Chat (title, folderId, modelId)
// ============================================

export const PATCH = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) throw new Error('Chat ID is required');
  const user = requireCurrentUser(req);
  const validated = updateChatSchema.parse(req.body);
  const result = await chatService.updateChat(id, user.id, {
    title: validated.title ?? undefined,
    folderId: validated.folderId ?? undefined,
    modelId: validated.modelId ?? undefined,
  });
  sendSuccess(res, result, 'Chat updated successfully');
};

// ============================================
// DELETE /api/v1/chats/:id - Delete Chat
// ============================================

export const DELETE = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;
  if (!id) throw new Error('Chat ID is required');
  const user = requireCurrentUser(req);
  const result = await chatService.deleteChat(id, user.id);
  sendSuccess(res, result, result.message);
};
