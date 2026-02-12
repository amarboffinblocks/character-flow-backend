import type { Request, Response } from 'express';
import { consumeStream } from 'ai';
import { chatService, createMessageSchema, messageQuerySchema } from '../../../../modules/chat/index.js';
import { sendSuccess } from '../../../../utils/response.js';
import { requireCurrentUser } from '../../../../middleware/auth.middleware.js';

// ============================================
// POST /api/v1/chats/:id/messages - Send Message to LLM
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
  const { id: chatId } = req.params;
  if (!chatId) throw new Error("Chat ID is required");

  const user = requireCurrentUser(req);
  const validated = createMessageSchema.parse(req.body);

  const { userMessage, streamResult } =
    await chatService.sendMessage(chatId, user.id, {
      content: validated.content ?? "",
      role: validated.role,
      trigger: validated.trigger,
      messageId: validated.messageId,
    });

  res.setHeader("X-User-Message-Id", userMessage.id);

  // AI SDK: consumeSseStream ensures onFinish runs even when client disconnects
  // (e.g. user closes tab) - assistant message is still saved to DB
  streamResult.pipeUIMessageStreamToResponse(res, {
    consumeSseStream: consumeStream,
  });
};

// ============================================
// GET /api/v1/chats/:id/messages - List Messages
// ============================================

export const GET = async (req: Request, res: Response): Promise<void> => {
    const { id: chatId } = req.params;
    if (!chatId) {
        throw new Error('Chat ID is required');
    }
    const user = requireCurrentUser(req);
    const queryParams = messageQuerySchema.parse(req.query);

    const result = await chatService.getMessagesByChat(chatId, user.id, queryParams);
    sendSuccess(res, result, 'Messages retrieved successfully');
};
