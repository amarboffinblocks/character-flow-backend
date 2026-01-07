import pino from 'pino';
import { config } from '../config/index.js';

export const logger = pino({
  level: config.app.isDev ? 'debug' : 'info',
  transport: config.app.isDev
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

