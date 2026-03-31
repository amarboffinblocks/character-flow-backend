// AUTO-GENERATED — do not edit. Run: npm run generate:routes
import { Router } from 'express';
import {
  registerRouteHandlers,
  resolveMiddlewareFromImportedModule,
  type FileRouteModule,
} from './router.js';

import * as route_i0 from '../endpoints/admin/idempotency/route.js';
import * as mw_i0 from '../endpoints/admin/idempotency/middleware.js';
import * as route_i1 from '../endpoints/auth/login/route.js';
import * as mw_i1 from '../endpoints/auth/login/middleware.js';
import * as route_i2 from '../endpoints/auth/username/check/route.js';
import * as mw_i2 from '../endpoints/auth/username/check/middleware.js';
import * as route_i3 from '../endpoints/backgrounds/[id]/default/route.js';
import * as mw_i3 from '../endpoints/backgrounds/[id]/default/middleware.js';
import * as route_i4 from '../endpoints/backgrounds/[id]/route.js';
import * as mw_i4 from '../endpoints/backgrounds/[id]/middleware.js';
import * as route_i5 from '../endpoints/backgrounds/import/bulk/route.js';
import * as mw_i5 from '../endpoints/backgrounds/import/bulk/middleware.js';
import * as route_i6 from '../endpoints/backgrounds/import/route.js';
import * as mw_i6 from '../endpoints/backgrounds/import/middleware.js';
import * as route_i7 from '../endpoints/backgrounds/route.js';
import * as mw_i7 from '../endpoints/backgrounds/middleware.js';
import * as route_i8 from '../endpoints/characters/[id]/favourite/route.js';
import * as mw_i8 from '../endpoints/characters/[id]/favourite/middleware.js';
import * as route_i9 from '../endpoints/characters/[id]/route.js';
import * as mw_i9 from '../endpoints/characters/[id]/middleware.js';
import * as route_i10 from '../endpoints/characters/[id]/saved/route.js';
import * as mw_i10 from '../endpoints/characters/[id]/saved/middleware.js';
import * as route_i11 from '../endpoints/characters/batch-delete/route.js';
import * as mw_i11 from '../endpoints/characters/batch-delete/middleware.js';
import * as route_i12 from '../endpoints/characters/batch-duplicate/route.js';
import * as mw_i12 from '../endpoints/characters/batch-duplicate/middleware.js';
import * as route_i13 from '../endpoints/characters/import/bulk/route.js';
import * as mw_i13 from '../endpoints/characters/import/bulk/middleware.js';
import * as route_i14 from '../endpoints/characters/import/route.js';
import * as mw_i14 from '../endpoints/characters/import/middleware.js';
import * as route_i15 from '../endpoints/characters/route.js';
import * as mw_i15 from '../endpoints/characters/middleware.js';
import * as route_i16 from '../endpoints/characters/slug/[slug]/route.js';
import * as mw_i16 from '../endpoints/characters/slug/[slug]/middleware.js';
import * as route_i17 from '../endpoints/chats/[id]/archive/route.js';
import * as mw_i17 from '../endpoints/chats/[id]/archive/middleware.js';
import * as route_i18 from '../endpoints/chats/[id]/duplicate/route.js';
import * as mw_i18 from '../endpoints/chats/[id]/duplicate/middleware.js';
import * as route_i19 from '../endpoints/chats/[id]/messages/[messageId]/route.js';
import * as mw_i19 from '../endpoints/chats/[id]/messages/[messageId]/middleware.js';
import * as route_i20 from '../endpoints/chats/[id]/messages/route.js';
import * as mw_i20 from '../endpoints/chats/[id]/messages/middleware.js';
import * as route_i21 from '../endpoints/chats/[id]/pin/route.js';
import * as mw_i21 from '../endpoints/chats/[id]/pin/middleware.js';
import * as route_i22 from '../endpoints/chats/[id]/route.js';
import * as mw_i22 from '../endpoints/chats/[id]/middleware.js';
import * as route_i23 from '../endpoints/chats/route.js';
import * as mw_i23 from '../endpoints/chats/middleware.js';
import * as route_i24 from '../endpoints/community/feature-request/route.js';
import * as mw_i24 from '../endpoints/community/feature-request/middleware.js';
import * as route_i25 from '../endpoints/folders/[id]/route.js';
import * as mw_i25 from '../endpoints/folders/[id]/middleware.js';
import * as route_i26 from '../endpoints/folders/route.js';
import * as mw_i26 from '../endpoints/folders/middleware.js';
import * as route_i27 from '../endpoints/lorebooks/[id]/entries/[entryId]/route.js';
import * as mw_i27 from '../endpoints/lorebooks/[id]/entries/[entryId]/middleware.js';
import * as route_i28 from '../endpoints/lorebooks/[id]/entries/route.js';
import * as mw_i28 from '../endpoints/lorebooks/[id]/entries/middleware.js';
import * as route_i29 from '../endpoints/lorebooks/[id]/favourite/route.js';
import * as mw_i29 from '../endpoints/lorebooks/[id]/favourite/middleware.js';
import * as route_i30 from '../endpoints/lorebooks/[id]/route.js';
import * as mw_i30 from '../endpoints/lorebooks/[id]/middleware.js';
import * as route_i31 from '../endpoints/lorebooks/[id]/saved/route.js';
import * as mw_i31 from '../endpoints/lorebooks/[id]/saved/middleware.js';
import * as route_i32 from '../endpoints/lorebooks/batch-delete/route.js';
import * as mw_i32 from '../endpoints/lorebooks/batch-delete/middleware.js';
import * as route_i33 from '../endpoints/lorebooks/import/route.js';
import * as mw_i33 from '../endpoints/lorebooks/import/middleware.js';
import * as route_i34 from '../endpoints/lorebooks/route.js';
import * as mw_i34 from '../endpoints/lorebooks/middleware.js';
import * as route_i35 from '../endpoints/lorebooks/slug/[slug]/route.js';
import * as mw_i35 from '../endpoints/lorebooks/slug/[slug]/middleware.js';
import * as route_i36 from '../endpoints/models/[id]/route.js';
import * as route_i37 from '../endpoints/models/route.js';
import * as mw_i37 from '../endpoints/models/middleware.js';
import * as route_i38 from '../endpoints/personas/[id]/duplicate/route.js';
import * as route_i39 from '../endpoints/personas/[id]/favourite/route.js';
import * as mw_i39 from '../endpoints/personas/[id]/favourite/middleware.js';
import * as route_i40 from '../endpoints/personas/[id]/route.js';
import * as mw_i40 from '../endpoints/personas/[id]/middleware.js';
import * as route_i41 from '../endpoints/personas/[id]/saved/route.js';
import * as mw_i41 from '../endpoints/personas/[id]/saved/middleware.js';
import * as route_i42 from '../endpoints/personas/batch-delete/route.js';
import * as mw_i42 from '../endpoints/personas/batch-delete/middleware.js';
import * as route_i43 from '../endpoints/personas/batch-duplicate/route.js';
import * as route_i44 from '../endpoints/personas/route.js';
import * as mw_i44 from '../endpoints/personas/middleware.js';
import * as route_i45 from '../endpoints/realms/[id]/chats/[chatId]/messages/[messageId]/route.js';
import * as mw_i45 from '../endpoints/realms/[id]/chats/[chatId]/messages/[messageId]/middleware.js';
import * as route_i46 from '../endpoints/realms/[id]/chats/[chatId]/messages/route.js';
import * as mw_i46 from '../endpoints/realms/[id]/chats/[chatId]/messages/middleware.js';
import * as route_i47 from '../endpoints/realms/[id]/chats/[chatId]/route.js';
import * as mw_i47 from '../endpoints/realms/[id]/chats/[chatId]/middleware.js';
import * as route_i48 from '../endpoints/realms/[id]/chats/route.js';
import * as mw_i48 from '../endpoints/realms/[id]/chats/middleware.js';
import * as route_i49 from '../endpoints/realms/[id]/route.js';
import * as mw_i49 from '../endpoints/realms/[id]/middleware.js';
import * as route_i50 from '../endpoints/realms/route.js';
import * as mw_i50 from '../endpoints/realms/middleware.js';
import * as route_i51 from '../endpoints/route.js';
import * as route_i52 from '../endpoints/tags/[id]/route.js';
import * as mw_i52 from '../endpoints/tags/[id]/middleware.js';
import * as route_i53 from '../endpoints/tags/popular/route.js';
import * as mw_i53 from '../endpoints/tags/popular/middleware.js';
import * as route_i54 from '../endpoints/tags/route.js';
import * as mw_i54 from '../endpoints/tags/middleware.js';
import * as route_i55 from '../endpoints/upload/presigned-url/route.js';
import * as mw_i55 from '../endpoints/upload/presigned-url/middleware.js';
import * as route_i56 from '../endpoints/upload/view-url/route.js';
import * as mw_i56 from '../endpoints/upload/view-url/middleware.js';
import * as route_i57 from '../endpoints/user/me/route.js';
import * as mw_i57 from '../endpoints/user/me/middleware.js';
import * as route_i58 from '../endpoints/user/profile/route.js';
import * as mw_i58 from '../endpoints/user/profile/middleware.js';

export function createGeneratedApiRouter(): Router {
  const router = Router();
  registerRouteHandlers(router, '/api/v1', [
    { routePath: "/admin/idempotency", routeModule: route_i0 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i0) },
    { routePath: "/auth/login", routeModule: route_i1 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i1) },
    { routePath: "/auth/username/check", routeModule: route_i2 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i2) },
    { routePath: "/backgrounds/:id/default", routeModule: route_i3 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i3) },
    { routePath: "/backgrounds/:id", routeModule: route_i4 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i4) },
    { routePath: "/backgrounds/import/bulk", routeModule: route_i5 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i5) },
    { routePath: "/backgrounds/import", routeModule: route_i6 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i6) },
    { routePath: "/backgrounds", routeModule: route_i7 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i7) },
    { routePath: "/characters/:id/favourite", routeModule: route_i8 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i8) },
    { routePath: "/characters/:id", routeModule: route_i9 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i9) },
    { routePath: "/characters/:id/saved", routeModule: route_i10 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i10) },
    { routePath: "/characters/batch-delete", routeModule: route_i11 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i11) },
    { routePath: "/characters/batch-duplicate", routeModule: route_i12 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i12) },
    { routePath: "/characters/import/bulk", routeModule: route_i13 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i13) },
    { routePath: "/characters/import", routeModule: route_i14 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i14) },
    { routePath: "/characters", routeModule: route_i15 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i15) },
    { routePath: "/characters/slug/:slug", routeModule: route_i16 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i16) },
    { routePath: "/chats/:id/archive", routeModule: route_i17 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i17) },
    { routePath: "/chats/:id/duplicate", routeModule: route_i18 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i18) },
    { routePath: "/chats/:id/messages/:messageId", routeModule: route_i19 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i19) },
    { routePath: "/chats/:id/messages", routeModule: route_i20 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i20) },
    { routePath: "/chats/:id/pin", routeModule: route_i21 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i21) },
    { routePath: "/chats/:id", routeModule: route_i22 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i22) },
    { routePath: "/chats", routeModule: route_i23 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i23) },
    { routePath: "/community/feature-request", routeModule: route_i24 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i24) },
    { routePath: "/folders/:id", routeModule: route_i25 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i25) },
    { routePath: "/folders", routeModule: route_i26 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i26) },
    { routePath: "/lorebooks/:id/entries/:entryId", routeModule: route_i27 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i27) },
    { routePath: "/lorebooks/:id/entries", routeModule: route_i28 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i28) },
    { routePath: "/lorebooks/:id/favourite", routeModule: route_i29 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i29) },
    { routePath: "/lorebooks/:id", routeModule: route_i30 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i30) },
    { routePath: "/lorebooks/:id/saved", routeModule: route_i31 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i31) },
    { routePath: "/lorebooks/batch-delete", routeModule: route_i32 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i32) },
    { routePath: "/lorebooks/import", routeModule: route_i33 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i33) },
    { routePath: "/lorebooks", routeModule: route_i34 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i34) },
    { routePath: "/lorebooks/slug/:slug", routeModule: route_i35 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i35) },
    { routePath: "/models/:id", routeModule: route_i36 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(null) },
    { routePath: "/models", routeModule: route_i37 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i37) },
    { routePath: "/personas/:id/duplicate", routeModule: route_i38 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(null) },
    { routePath: "/personas/:id/favourite", routeModule: route_i39 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i39) },
    { routePath: "/personas/:id", routeModule: route_i40 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i40) },
    { routePath: "/personas/:id/saved", routeModule: route_i41 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i41) },
    { routePath: "/personas/batch-delete", routeModule: route_i42 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i42) },
    { routePath: "/personas/batch-duplicate", routeModule: route_i43 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(null) },
    { routePath: "/personas", routeModule: route_i44 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i44) },
    { routePath: "/realms/:id/chats/:chatId/messages/:messageId", routeModule: route_i45 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i45) },
    { routePath: "/realms/:id/chats/:chatId/messages", routeModule: route_i46 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i46) },
    { routePath: "/realms/:id/chats/:chatId", routeModule: route_i47 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i47) },
    { routePath: "/realms/:id/chats", routeModule: route_i48 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i48) },
    { routePath: "/realms/:id", routeModule: route_i49 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i49) },
    { routePath: "/realms", routeModule: route_i50 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i50) },
    { routePath: "/", routeModule: route_i51 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(null) },
    { routePath: "/tags/:id", routeModule: route_i52 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i52) },
    { routePath: "/tags/popular", routeModule: route_i53 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i53) },
    { routePath: "/tags", routeModule: route_i54 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i54) },
    { routePath: "/upload/presigned-url", routeModule: route_i55 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i55) },
    { routePath: "/upload/view-url", routeModule: route_i56 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i56) },
    { routePath: "/user/me", routeModule: route_i57 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i57) },
    { routePath: "/user/profile", routeModule: route_i58 as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i58) },
  ]);
  return router;
}
