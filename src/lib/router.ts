import { Router, type RequestHandler, type Request, type Response } from 'express';
import { readdirSync, statSync, existsSync } from 'fs';
import { join, relative, resolve } from 'path';
import { pathToFileURL } from 'url';
import { logger } from './logger.js';
import { asyncRouteHandler } from '../middleware/error.middleware.js';
import type { HttpMethod } from '../types/index.js';

// Route handler type for file-based routing
type FileRouteHandler = (req: Request, res: Response) => Promise<void> | void;

export interface FileRouteModule {
  default?: Record<string, FileRouteHandler>;
  GET?: FileRouteHandler;
  POST?: FileRouteHandler;
  PUT?: FileRouteHandler;
  PATCH?: FileRouteHandler;
  DELETE?: FileRouteHandler;
  middleware?: RequestHandler[];
}

/** Used by the generated Vercel route registry (static imports). */
export type RouteRegistrationEntry = {
  routePath: string;
  routeModule: FileRouteModule;
  middleware: RequestHandler[] | Record<string, RequestHandler[]>;
};

// ============================================
// File-Based Router (Next.js App Router Style)
// ============================================

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Converts a file path to an Express route path
 * Examples:
 *   /auth/login/route.ts -> /auth/login
 *   /characters/[id]/route.ts -> /characters/:id
 *   /characters/[id]/favorite/route.ts -> /characters/:id/favorite
 */
export const filePathToRoutePath = (filePath: string): string => {
  // Handle root route file
  if (filePath === 'route.ts' || filePath === 'route.js') {
    return '/';
  }

  // Remove 'route.ts' or 'route.js' from the end (handles both dev and production)
  let routePath = filePath.replace(/\/?route\.(ts|js)$/, '');

  // Convert [param] to :param (Next.js style dynamic routes)
  routePath = routePath.replace(/\[([^\]]+)\]/g, ':$1');

  // Ensure path starts with /
  if (!routePath.startsWith('/')) {
    routePath = '/' + routePath;
  }

  // Handle empty path (root route)
  if (routePath === '' || routePath === '/') {
    return '/';
  }

  return routePath;
};

/**
 * Recursively finds all route.ts or route.js files in a directory
 * Supports both dev (tsx) and production (compiled .js)
 */
const findRouteFiles = (dir: string, baseDir: string = dir): string[] => {
  const files: string[] = [];

  if (!existsSync(dir)) {
    return files;
  }

  const entries = readdirSync(dir);

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...findRouteFiles(fullPath, baseDir));
    } else if (entry === 'route.ts' || entry === 'route.js') {
      const relativePath = relative(baseDir, fullPath);
      files.push(relativePath);
    }
  }

  return files;
};

/**
 * Loads middleware from a middleware.ts or middleware.js file if it exists
 * Supports both method-specific middleware (Record<string, RequestHandler[]>) and general middleware (RequestHandler[])
 */
const loadMiddleware = async (dir: string): Promise<RequestHandler[] | Record<string, RequestHandler[]>> => {
  const middlewarePathTs = join(dir, 'middleware.ts');
  const middlewarePathJs = join(dir, 'middleware.js');
  const middlewarePath = existsSync(middlewarePathTs) ? middlewarePathTs : existsSync(middlewarePathJs) ? middlewarePathJs : null;

  if (!middlewarePath) {
    return [];
  }

  try {
    const fileUrl = pathToFileURL(middlewarePath).href;
    const module = await import(fileUrl);
    const middleware = module.default || module.middleware;

    if (Array.isArray(middleware)) {
      return middleware;
    }

    if (typeof middleware === 'function') {
      return [middleware];
    }

    // Support method-specific middleware (Record<string, RequestHandler[]>)
    if (middleware && typeof middleware === 'object' && !Array.isArray(middleware)) {
      return middleware as Record<string, RequestHandler[]>;
    }

    return [];
  } catch (error) {
    logger.warn({ err: error, path: middlewarePath }, 'Failed to load middleware');
    return [];
  }
};

export const resolveMiddlewareFromImportedModule = (
  mod: { default?: unknown; middleware?: unknown } | null | undefined
): RequestHandler[] | Record<string, RequestHandler[]> => {
  if (!mod) {
    return [];
  }
  const middleware = mod.default ?? mod.middleware;

  if (Array.isArray(middleware)) {
    return middleware as RequestHandler[];
  }

  if (typeof middleware === 'function') {
    return [middleware as RequestHandler];
  }

  if (middleware && typeof middleware === 'object' && !Array.isArray(middleware)) {
    return middleware as Record<string, RequestHandler[]>;
  }

  return [];
};

/**
 * Registers pre-loaded route modules (filesystem scan or generated registry).
 */
export const registerRouteHandlers = (
  router: Router,
  basePath: string,
  entries: RouteRegistrationEntry[]
): void => {
  for (const { routePath, routeModule: module, middleware } of entries) {
    for (const method of HTTP_METHODS) {
      const handler = module[method] || module.default?.[method as keyof typeof module.default];

      if (handler) {
        const lowerMethod = method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';

        const wrappedHandler = asyncRouteHandler(handler);

        let methodMiddleware: RequestHandler[] = [];
        if (Array.isArray(middleware)) {
          methodMiddleware = middleware;
        } else if (middleware && typeof middleware === 'object' && !Array.isArray(middleware)) {
          const recordMiddleware = middleware as Record<string, RequestHandler[]>;
          if (method in recordMiddleware && Array.isArray(recordMiddleware[method])) {
            methodMiddleware = recordMiddleware[method];
          }
        }

        const handlers: RequestHandler[] = [...methodMiddleware, wrappedHandler];

        router[lowerMethod](routePath, ...handlers);
        logger.debug(`Registered ${method} ${basePath}${routePath}`);
      }
    }
  }
};

/**
 * Creates an Express router from a directory of route files
 */
export const createFileRouter = async (endpointsDir: string, basePath: string = ''): Promise<Router> => {
  const router = Router();
  const absoluteDir = resolve(endpointsDir);
  const routeFiles = findRouteFiles(absoluteDir);

  logger.info(`Found ${routeFiles.length} route files in ${endpointsDir}`);

  const entries: RouteRegistrationEntry[] = [];

  for (const routeFile of routeFiles) {
    const fullPath = join(absoluteDir, routeFile);
    const routePath = filePathToRoutePath(routeFile);
    const routeDir = join(absoluteDir, routeFile.replace(/\/route\.(ts|js)$/, ''));

    try {
      const fileUrl = pathToFileURL(fullPath).href;
      const routeModule: FileRouteModule = await import(fileUrl);
      const middleware = await loadMiddleware(routeDir);
      entries.push({ routePath, routeModule, middleware });
    } catch (error) {
      logger.error({ err: error, route: routeFile }, 'Failed to load route');
    }
  }

  registerRouteHandlers(router, basePath, entries);

  return router;
};

/**
 * Creates an Express router with manual route registration
 * (Alternative to file-based routing)
 */
export const createRouter = (): Router => {
  return Router();
};

export default createFileRouter;

