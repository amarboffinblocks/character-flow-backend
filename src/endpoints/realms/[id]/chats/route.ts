import type { Request, Response } from 'express';
import { z } from 'zod';
import { realmChatService } from '../../../../modules/realm/index.js';
import { chatQuerySchema } from '../../../../modules/chat/index.js';
import { sendSuccess } from '../../../../utils/response.js';
import { requireCurrentUser } from '../../../../middleware/auth.middleware.js';

const createRealmChatSchema = z.object({
  title: z.string().max(500).trim().optional().nullable(),
});

function requireRealmId(params: { id?: string }): string {
  const id = params.id;
  if (!id) throw new Error('Realm ID is required');
  return id;
}

// GET /api/v1/realms/:id/chats - List realm chats
export const GET = async (req: Request, res: Response): Promise<void> => {
  const realmId = requireRealmId(req.params);
  const user = requireCurrentUser(req);
  const queryParams = chatQuerySchema.omit({ realmId: true }).parse(req.query);
  const result = await realmChatService.listRealmChats(realmId, user.id, {
    ...queryParams,
    realmId,
  });
  sendSuccess(res, result, 'Realm chats retrieved successfully');
};

// POST /api/v1/realms/:id/chats - Create realm chat
export const POST = async (req: Request, res: Response): Promise<void> => {
  const realmId = requireRealmId(req.params);
  const user = requireCurrentUser(req);
  const body = createRealmChatSchema.parse(req.body ?? {});
  const result = await realmChatService.createRealmChat(realmId, user.id, {
    title: body.title ?? null,
  });
  sendSuccess(res, result, 'Realm chat created successfully', 201);
};
