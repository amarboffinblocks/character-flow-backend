import { Router, type RequestHandler, type Request, type Response } from 'express';
import { readdirSync, statSync, existsSync } from 'fs';
import { join, relative, resolve } from 'path';
import { pathToFileURL } from 'url';
import { logger } from './logger.js';
import { asyncRouteHandler } from '../middleware/error.middleware.js';
import type { HttpMethod } from '../types/index.js';

// Route handler type for file-based routing
type FileRouteHandler = (req: Request, res: Response) => Promise<void> | void;

interface FileRouteModule {
  default?: Record<string, FileRouteHandler>;
  GET?: FileRouteHandler;
  POST?: FileRouteHandler;
  PUT?: FileRouteHandler;
  PATCH?: FileRouteHandler;
  DELETE?: FileRouteHandler;
  middleware?: RequestHandler[];
}

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
const filePathToRoutePath = (filePath: string): string => {
  // Handle root route.ts file
  if (filePath === 'route.ts') {
    return '/';
  }

  // Remove 'route.ts' from the end (handles both /route.ts and route.ts)
  let routePath = filePath.replace(/\/?route\.ts$/, '');

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
 * Recursively finds all route.ts files in a directory
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
    } else if (entry === 'route.ts') {
      const relativePath = relative(baseDir, fullPath);
      files.push(relativePath);
    }
  }

  return files;
};

/**
 * Loads middleware from a middleware.ts file if it exists
 * Supports both method-specific middleware (Record<string, RequestHandler[]>) and general middleware (RequestHandler[])
 */
const loadMiddleware = async (dir: string): Promise<RequestHandler[] | Record<string, RequestHandler[]>> => {
  const middlewarePath = join(dir, 'middleware.ts');

  if (!existsSync(middlewarePath)) {
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

/**
 * Creates an Express router from a directory of route files
 */
export const createFileRouter = async (endpointsDir: string, basePath: string = ''): Promise<Router> => {
  const router = Router();
  const absoluteDir = resolve(endpointsDir);
  const routeFiles = findRouteFiles(absoluteDir);

  logger.info(`Found ${routeFiles.length} route files in ${endpointsDir}`);

  for (const routeFile of routeFiles) {
    const fullPath = join(absoluteDir, routeFile);
    const routePath = filePathToRoutePath(routeFile);
    const routeDir = join(absoluteDir, routeFile.replace(/\/route\.ts$/, ''));

    try {
      // Load route module
      const fileUrl = pathToFileURL(fullPath).href;
      const module: FileRouteModule = await import(fileUrl);

      // Load middleware for this route
      const middleware = await loadMiddleware(routeDir);

      // Register each HTTP method
      for (const method of HTTP_METHODS) {
        const handler = module[method] || module.default?.[method as keyof typeof module.default];

        if (handler) {
          const lowerMethod = method.toLowerCase() as 'get' | 'post' | 'put' | 'patch' | 'delete';
          
          // Wrap handler with asyncRouteHandler to automatically catch errors
          const wrappedHandler = asyncRouteHandler(handler);

          // Handle method-specific middleware (Record) or general middleware (Array)
          let methodMiddleware: RequestHandler[] = [];
          if (Array.isArray(middleware)) {
            methodMiddleware = middleware;
          } else if (middleware && typeof middleware === 'object' && !Array.isArray(middleware)) {
            // Check if it's a Record with method-specific middleware
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
    } catch (error) {
      logger.error({ err: error, route: routeFile }, 'Failed to load route');
    }
  }

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

