import type { Request, Response } from 'express';
import { consumeStream } from 'ai';
import { realmChatService } from '../../../../../../modules/realm/index.js';
import { createMessageSchema, messageQuerySchema } from '../../../../../../modules/chat/index.js';
import { sendSuccess } from '../../../../../../utils/response.js';
import { requireCurrentUser } from '../../../../../../middleware/auth.middleware.js';
import { logger } from '../../../../../../lib/logger.js';

function requireIds(params: { id?: string; chatId?: string }): { realmId: string; chatId: string } {
  const realmId = params.id;
  const chatId = params.chatId;
  if (!realmId) throw new Error('Realm ID is required');
  if (!chatId) throw new Error('Chat ID is required');
  return { realmId, chatId };
}

// GET /api/v1/realms/:id/chats/:chatId/messages - List realm chat messages
export const GET = async (req: Request, res: Response): Promise<void> => {
  const { realmId, chatId } = requireIds(req.params);
  const user = requireCurrentUser(req);
  const queryParams = messageQuerySchema.parse(req.query);
  const result = await realmChatService.getRealmChatMessages(realmId, chatId, user.id, queryParams);
  sendSuccess(res, result, 'Messages retrieved successfully');
};

// POST /api/v1/realms/:id/chats/:chatId/messages - Send message (streaming)
export const POST = async (req: Request, res: Response): Promise<void> => {
  const { realmId, chatId } = requireIds(req.params);
  const user = requireCurrentUser(req);
  const validated = createMessageSchema.parse(req.body);

  const { userMessage, streamResult } = await realmChatService.sendRealmChatMessage(
    realmId,
    chatId,
    user.id,
    {
      content: validated.content ?? '',
      role: validated.role,
      trigger: validated.trigger,
      messageId: validated.messageId,
      attachments: validated.attachments,
    }
  );

  res.setHeader('X-User-Message-Id', userMessage.id);

  try {
    streamResult.pipeUIMessageStreamToResponse(res, {
      consumeSseStream: consumeStream,
    });
  } catch (pipeErr) {
    if (!res.headersSent) {
      logger.error(
        { realmId, chatId, userId: user.id, err: pipeErr },
        'Failed to pipe realm chat stream to response'
      );
      throw pipeErr;
    }
    logger.error(
      { realmId, chatId, userId: user.id, err: pipeErr },
      'Realm chat stream pipe error after headers sent'
    );
  }
};
