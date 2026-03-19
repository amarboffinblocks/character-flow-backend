import type { Request, Response } from 'express';
import { chatService } from '../../../../../modules/chat/index.js';
import { sendSuccess } from '../../../../../utils/response.js';
import { requireCurrentUser } from '../../../../../middleware/auth.middleware.js';

export const DELETE = async (req: Request, res: Response): Promise<void> => {
  const chatId = req.params.id;
  const messageId = req.params.messageId;
  if (!chatId) throw new Error('Chat ID is required');
  if (!messageId) throw new Error('Message ID is required');
  const user = requireCurrentUser(req);
  const result = await chatService.deleteMessageById(chatId, user.id, messageId);
  sendSuccess(res, result, result.message);
};
