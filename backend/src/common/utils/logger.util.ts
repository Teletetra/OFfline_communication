import { Logger } from '@nestjs/common';
export const appLogger = new Logger('Application');
export const logError = (scope: string, error: unknown) => appLogger.error(`[${scope}] ${error instanceof Error ? error.message : String(error)}`);