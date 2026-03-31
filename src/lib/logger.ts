import pino from 'pino';
import { config } from '../config/index.js';

const usePrettyLogger = config.app.isDev && process.env.VERCEL !== '1';

export const logger = pino({
  level: config.app.isDev ? 'debug' : 'info',
  transport: usePrettyLogger
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
  base: {
    env: config.app.env,
    service: config.app.name,
  },
});

export default logger;

