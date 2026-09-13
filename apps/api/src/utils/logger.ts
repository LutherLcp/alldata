import { config } from '@/config';
import pino from 'pino';

const isDevelopment = config.NODE_ENV === 'development';

export const logger = pino({
  level: isDevelopment ? 'debug' : 'info',
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
      }
    : undefined,
  redact: {
    paths: ['*.password', '*.secret', '*.token', '*.authorization', 'req.headers.authorization'],
    censor: '[REDACTED]',
  },
});
