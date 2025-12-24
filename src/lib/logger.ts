/**
 * Environment-aware logging utility
 * Only logs detailed errors in development mode
 */

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const isDev = import.meta.env.DEV;

export const logger = {
  error: (context: string, error: unknown) => {
    if (isDev) {
      console.error(`[${context}]`, error);
    }
    // In production, you could send to error tracking service like Sentry
  },
  
  warn: (context: string, message: string, data?: unknown) => {
    if (isDev) {
      console.warn(`[${context}]`, message, data);
    }
  },
  
  info: (context: string, message: string, data?: unknown) => {
    if (isDev) {
      console.info(`[${context}]`, message, data);
    }
  },
  
  debug: (context: string, message: string, data?: unknown) => {
    if (isDev) {
      console.debug(`[${context}]`, message, data);
    }
  },
};
