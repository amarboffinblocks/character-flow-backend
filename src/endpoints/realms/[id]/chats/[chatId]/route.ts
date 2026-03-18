import type { Request, Response } from 'express';
import { realmChatService } from '../../../../../modules/realm/index.js';
import { sendSuccess } from '../../../../../utils/response.js';
import { requireCurrentUser } from '../../../../../middleware/auth.middleware.js';

function requireIds(params: { id?: string; chatId?: string }): { realmId: string; chatId: string } {
  const realmId = params.id;
  const chatId = params.chatId;
  if (!realmId) throw new Error('Realm ID is required');
  if (!chatId) throw new Error('Chat ID is required');
  return { realmId, chatId };
}

// GET /api/v1/realms/:id/chats/:chatId - Get one realm chat
export const GET = async (req: Request, res: Response): Promise<void> => {
  const { realmId, chatId } = requireIds(req.params);
  const user = requireCurrentUser(req);
  const result = await realmChatService.getRealmChat(realmId, chatId, user.id);
  sendSuccess(res, result, 'Realm chat retrieved successfully');
};
