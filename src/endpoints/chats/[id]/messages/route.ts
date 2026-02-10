import type { Request, Response } from 'express';
import { chatService, createMessageSchema, messageQuerySchema } from '../../../../modules/chat/index.js';
import { sendSuccess } from '../../../../utils/response.js';
import { requireCurrentUser } from '../../../../middleware/auth.middleware.js';

// ============================================
// POST /api/v1/chats/:id/messages - Send Message to LLM
// ============================================

export const POST = async (req: Request, res: Response): Promise<void> => {
    const { id: chatId } = req.params;
    if (!chatId) throw new Error('Chat ID is required');

    const user = requireCurrentUser(req);
    const validated = createMessageSchema.parse(req.body);

    const stream =
        req.query.stream === 'true' ||
        req.headers.accept?.includes('text/event-stream');

    // ======================================================
    // 🔥 STREAMING MODE (SSE)
    // ======================================================
    if (stream) {
        // SSE headers (important for nginx / vercel / cloudflare)
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache, no-transform');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.setHeader('Content-Encoding', 'identity');

        const socket = res.socket as (NodeJS.Socket & { setNoDelay?: (b: boolean) => void }) | undefined;
        socket?.setNoDelay?.(true);

        res.flushHeaders?.();
        res.write(': connected\n\n');

        // 🔥 Track client disconnect
        let clientDisconnected = false;
        const onClose = () => {
            clientDisconnected = true;
        };

        req.on('close', onClose);
        res.on('close', onClose);

        // 🔥 heartbeat ping every 15s (prevents proxy timeout)
        const heartbeat = setInterval(() => {
            if (!clientDisconnected) {
                res.write(': ping\n\n');
            }
        }, 15000);

        try {
            const streamGenerator = chatService.streamMessage(
                chatId,
                user.id,
                {
                    content: validated.content,
                    role: validated.role,
                }
            );

            for await (const chunk of streamGenerator) {
                // Check client disconnect before each write
                if (clientDisconnected || !socket?.writable) {
                    break;
                }

                if (chunk.type === 'content' && chunk.content) {
                    // Write each character immediately (no buffering)
                    res.write(`data: ${JSON.stringify({
                        type: 'content',
                        content: chunk.content,
                    })}\n\n`);
                    // Note: res.flush() doesn't exist in Express without compression
                    // setNoDelay(true) ensures immediate send
                }

                if (chunk.type === 'done') {
                    // Send done message
                    res.write(`data: ${JSON.stringify({
                        type: 'done',
                        messageId: chunk.messageId,
                        usage: chunk.usage,
                    })}\n\n`);
                    // Send [DONE] marker for SSE completion
                    res.write('data: [DONE]\n\n');
                    break;
                }
            }

            clearInterval(heartbeat);
            req.off('close', onClose);
            res.end();

        } catch (error) {
            clearInterval(heartbeat);
            req.off('close', onClose);

            const message = error instanceof Error ? error.message : String(error);
            res.write(`data: ${JSON.stringify({ type: 'error', error: message })}\n\n`);
            res.end();
        }

        return;
    }

    // ======================================================
    // NON-STREAM MODE
    // ======================================================

    const result = await chatService.sendMessage(chatId, user.id, {
        content: validated.content,
        role: validated.role,
    });

    sendSuccess(res, result, 'Message sent successfully', 201);
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
