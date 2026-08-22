import { ConfigService } from '@nestjs/config';

export const websocketConfig = (config: ConfigService) => ({
  path: config.get<string>('WS_PATH', '/chat'),
  cors: { origin: config.get<string>('CORS_ORIGIN', '*'), credentials: true },
});