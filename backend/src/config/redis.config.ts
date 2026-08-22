import { ConfigService } from '@nestjs/config';

export const redisConfig = (config: ConfigService) => ({
  host: config.get<string>('REDIS_HOST', 'localhost'),
  port: config.get<number>('REDIS_PORT', 6379),
  password: config.get<string | undefined>('REDIS_PASSWORD'),
});