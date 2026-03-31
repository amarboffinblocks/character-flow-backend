import { existsSync, readdirSync, statSync, writeFileSync } from 'fs';
import { dirname, join, relative, sep } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const endpointsRoot = join(__dirname, '../src/endpoints');
const outFile = join(__dirname, '../src/lib/route-registry.generated.ts');

const filePathToRoutePath = (filePath: string): string => {
  const unixPath = filePath.split(sep).join('/');
  if (unixPath === 'route.ts' || unixPath === 'route.js') {
    return '/';
  }
  let routePath = unixPath.replace(/\/?route\.(ts|js)$/, '');
  routePath = routePath.replace(/\[([^\]]+)\]/g, ':$1');
  if (!routePath.startsWith('/')) {
    routePath = '/' + routePath;
  }
  if (routePath === '' || routePath === '/') {
    return '/';
  }
  return routePath;
};

const findRouteFiles = (dir: string, baseDir: string = dir): string[] => {
  const files: string[] = [];
  if (!existsSync(dir)) {
    return files;
  }
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...findRouteFiles(fullPath, baseDir));
    } else if (entry === 'route.ts' || entry === 'route.js') {
      files.push(relative(baseDir, fullPath).split(sep).join('/'));
    }
  }
  return files;
};

const routes = findRouteFiles(endpointsRoot, endpointsRoot).sort((a, b) => a.localeCompare(b));
const importLines: string[] = [];
const regLines: string[] = [];

routes.forEach((routeFile, i) => {
  const rel = routeFile.split(sep).join('/');
  const base = rel.replace(/\/?route\.(ts|js)$/, '');
  const routeImport =
    base === '' ? `../endpoints/route.js` : `../endpoints/${base}/route.js`;
  importLines.push(`import * as route_i${i} from '${routeImport}';`);
  const mwDir = base === '' ? endpointsRoot : join(endpointsRoot, ...base.split('/'));
  const mwTs = join(mwDir, 'middleware.ts');
  const mwJs = join(mwDir, 'middleware.js');
  const mwImport =
    base === '' ? `../endpoints/middleware.js` : `../endpoints/${base}/middleware.js`;
  if (existsSync(mwTs) || existsSync(mwJs)) {
    importLines.push(`import * as mw_i${i} from '${mwImport}';`);
    regLines.push(
      `    { routePath: ${JSON.stringify(filePathToRoutePath(rel))}, routeModule: route_i${i} as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(mw_i${i}) },`
    );
  } else {
    regLines.push(
      `    { routePath: ${JSON.stringify(filePathToRoutePath(rel))}, routeModule: route_i${i} as unknown as FileRouteModule, middleware: resolveMiddlewareFromImportedModule(null) },`
    );
  }
});

const content = `// AUTO-GENERATED — do not edit. Run: npm run generate:routes
import { Router } from 'express';
import {
  registerRouteHandlers,
  resolveMiddlewareFromImportedModule,
  type FileRouteModule,
} from './router.js';

${importLines.join('\n')}

export function createGeneratedApiRouter(): Router {
  const router = Router();
  registerRouteHandlers(router, '/api/v1', [
${regLines.join('\n')}
  ]);
  return router;
}
`;

writeFileSync(outFile, content);
console.log(`Wrote ${routes.length} routes to ${relative(join(__dirname, '..'), outFile)}`);
