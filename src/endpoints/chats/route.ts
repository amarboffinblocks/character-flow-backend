import type { Request, Response } from 'express';
import { chatService, chatQuerySchema, createChatSchema } from '../../modules/chat/index.js';
import { sendSuccess } from '../../utils/response.js';
import { requireCurrentUser } from '../../middleware/auth.middleware.js';

// ============================================
// GET /api/v1/chats - List Chats
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
  const user = requireCurrentUser(req);
  const queryParams = chatQuerySchema.parse(req.query);
  const result = await chatService.getUserChats(user.id, queryParams);
  sendSuccess(res, result, 'Chats retrieved successfully');
};

// ============================================
// POST /api/v1/chats - Create Chat (with selected modelId)
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
  const user = requireCurrentUser(req);
  const validated = createChatSchema.parse(req.body);
  const result = await chatService.createChat(user.id, {
    characterId: validated.characterId ?? undefined,
    realmId: validated.realmId ?? undefined,
    folderId: validated.folderId ?? undefined,
    modelId: validated.modelId,
    title: validated.title ?? undefined,
  });
  sendSuccess(res, result, 'Chat created successfully', 201);
};
