import swaggerUi from 'swagger-ui-express';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { load as loadYaml } from 'js-yaml';
import type { Express } from 'express';
import { logger } from './logger.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Get the project root directory
 * Works both in development (src/) and production (dist/)
 */
const getProjectRoot = (): string => {
  // In development: __dirname = src/lib
  // In production: __dirname = dist/lib
  // Project root is always 2 levels up
  const projectRoot = join(__dirname, '../..');
  return projectRoot;
};

/**
 * Load Swagger/OpenAPI specification from YAML file
 */
export const loadSwaggerSpec = (): any | null => {
  try {
    // Path to the Swagger YAML file (in project root)
    const projectRoot = getProjectRoot();
    const swaggerPath = join(projectRoot, 'API_SWAGGER.yaml');

    logger.info({ swaggerPath }, 'Loading Swagger spec from');

    // Check if file exists first
    if (!existsSync(swaggerPath)) {
      logger.warn({ swaggerPath }, 'Swagger file not found, Swagger UI will not be available');
      return null;
    }

    const yamlContent = readFileSync(swaggerPath, 'utf-8');

    if (!yamlContent || yamlContent.trim().length === 0) {
      logger.warn({ swaggerPath }, 'Swagger file is empty');
      return null;
    }

    const swaggerSpec = loadYaml(yamlContent) as any;

    if (!swaggerSpec) {
      logger.warn({ swaggerPath }, 'Failed to parse Swagger YAML');
      return null;
    }

    logger.info('✅ Swagger spec loaded successfully');
    return swaggerSpec;
  } catch (error) {
    logger.error({ error, __dirname }, 'Error loading Swagger spec');
    return null;
  }
};

/**
 * Setup Swagger UI middleware
 */
export const setupSwagger = (app: Express): void => {
  try {
    const swaggerSpec = loadSwaggerSpec();

    // If spec is null, Swagger file doesn't exist or couldn't be loaded
    if (!swaggerSpec) {
      logger.warn('⚠️  Swagger UI not available - API_SWAGGER.yaml file not found or invalid');
      // Register a simple message route so users know why it's not available
      app.get('/api-docs', (_req, res) => {
        res.status(503).json({
          success: false,
          error: {
            code: 'SERVICE_UNAVAILABLE',
            message: 'Swagger documentation is not available. API_SWAGGER.yaml file is missing.',
          },
        });
      });
      return;
    }

    // Swagger UI options
    const swaggerUiOptions = {
      customCss: `
        .swagger-ui .topbar { display: none; }
        .swagger-ui .info { margin: 20px 0; }
        .swagger-ui .scheme-container { background: #fafafa; padding: 10px; border-radius: 4px; }
      `,
      customSiteTitle: 'youruniverse.ai API Documentation',
      customfavIcon: '/favicon.ico',
      swaggerOptions: {
        persistAuthorization: true, // Persist auth token in browser
        displayRequestDuration: true,
        filter: true, // Enable search/filter
        tryItOutEnabled: true, // Enable "Try it out" by default
        docExpansion: 'list', // 'none', 'list', or 'full'
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
      },
    };

    // Serve Swagger UI at /api-docs
    // swagger-ui-express pattern: serve static files, then setup UI
    // swaggerUi.serve returns an array of middleware functions
    const swaggerServe = swaggerUi.serve;
    const swaggerSetup = swaggerUi.setup(swaggerSpec, swaggerUiOptions);

    // Use spread operator to apply all middleware from swaggerUi.serve
    app.use('/api-docs', ...swaggerServe);
    app.get('/api-docs', swaggerSetup);

    // Serve Swagger JSON at /api-docs.json
    app.get('/api-docs.json', (_req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerSpec);
    });

    // Serve Swagger YAML at /api-docs.yaml
    app.get('/api-docs.yaml', (_req, res) => {
      const projectRoot = getProjectRoot();
      const swaggerPath = join(projectRoot, 'API_SWAGGER.yaml');

      if (!existsSync(swaggerPath)) {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Swagger YAML file not found',
          },
        });
        return;
      }

      const yamlContent = readFileSync(swaggerPath, 'utf-8');
      res.setHeader('Content-Type', 'text/yaml');
      res.send(yamlContent);
      return;
    });

    logger.info('✅ Swagger UI available at /api-docs');
    logger.info('✅ Swagger JSON available at /api-docs.json');
    logger.info('✅ Swagger YAML available at /api-docs.yaml');
  } catch (error) {
    logger.error({ error }, '❌ Failed to setup Swagger');
    // Register a fallback route
    app.get('/api-docs', (_req, res) => {
      res.status(503).json({
        success: false,
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Swagger documentation is currently unavailable due to a setup error.',
        },
      });
    });
  }
};
