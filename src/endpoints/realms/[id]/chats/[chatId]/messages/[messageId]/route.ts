import type { Request, Response } from 'express';
import { realmChatService } from '../../../../../../../modules/realm/index.js';
import { sendSuccess } from '../../../../../../../utils/response.js';
import { requireCurrentUser } from '../../../../../../../middleware/auth.middleware.js';

export const DELETE = async (req: Request, res: Response): Promise<void> => {
  const realmId = req.params.id;
  const chatId = req.params.chatId;
  const messageId = req.params.messageId;
  if (!realmId) throw new Error('Realm ID is required');
  if (!chatId) throw new Error('Chat ID is required');
  if (!messageId) throw new Error('Message ID is required');
  const user = requireCurrentUser(req);
  const result = await realmChatService.deleteRealmChatMessage(realmId, chatId, user.id, messageId);
  sendSuccess(res, result, result.message);
};
