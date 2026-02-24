import type { Request, Response } from 'express';
import { consumeStream } from 'ai';
import { chatService, createMessageSchema, messageQuerySchema } from '../../../../modules/chat/index.js';
import { createError, sendSuccess } from '../../../../utils/index.js';
import { requireCurrentUser } from '../../../../middleware/auth.middleware.js';
import { logger } from '../../../../lib/logger.js';

function requireChatId(params: { id?: string }): string {
  const chatId = params.id;
  if (!chatId) throw createError.badRequest('Chat ID is required');
  return chatId;
}

export const POST = async (req: Request, res: Response): Promise<void> => {
  const chatId = requireChatId(req.params);
  const user = requireCurrentUser(req);
  const validated = createMessageSchema.parse(req.body);

  // All errors before streaming are caught by asyncRouteHandler -> error handler
  const { userMessage, streamResult } = await chatService.sendMessage(chatId, user.id, {
    content: validated.content ?? '',
    role: validated.role,
    trigger: validated.trigger,
    messageId: validated.messageId,
    attachments: validated.attachments,
  });

  res.setHeader('X-User-Message-Id', userMessage.id);

  try {
    // pipeUIMessageStreamToResponse returns void - it pipes the stream to res asynchronously.
    // Streaming happens in the background; no return value is expected.
    streamResult.pipeUIMessageStreamToResponse(res, {
      consumeSseStream: consumeStream,
    });
  } catch (pipeErr) {
    // Guard: if pipe throws before headers sent, we can still send error
    if (!res.headersSent) {
      logger.error({ chatId, userId: user.id, err: pipeErr }, 'Failed to pipe LLM stream to response');
      throw pipeErr;
    }
    logger.error({ chatId, userId: user.id, err: pipeErr }, 'Stream pipe error after headers sent');
  }
};

export const GET = async (req: Request, res: Response): Promise<void> => {
  const chatId = requireChatId(req.params);
  const user = requireCurrentUser(req);
  const queryParams = messageQuerySchema.parse(req.query);
  const result = await chatService.getMessagesByChat(chatId, user.id, queryParams);
  sendSuccess(res, result, 'Messages retrieved successfully');
};
