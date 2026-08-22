// backend/src/config/database.config.ts
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

export const databaseConfig = (configService: ConfigService): TypeOrmModuleOptions => {
  const environment = configService.get('NODE_ENV', 'development');
  
  const baseConfig: TypeOrmModuleOptions = {
    type: 'postgres',
    host: configService.get('DB_HOST', 'localhost'),
    port: configService.get('DB_PORT', 5432),
    username: configService.get('DB_USERNAME', 'postgres'),
    password: configService.get('DB_PASSWORD', 'password'),
    database: configService.get('DB_NAME', 'secure_chat'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    namingStrategy: new SnakeNamingStrategy(),
    synchronize: environment === 'development',
    logging: environment === 'development',
    logger: 'advanced-console',
    maxQueryExecutionTime: 1000,
    cache: {
      duration: 60000, // 1 minute
    },
    extra: {
      max: 20,
      min: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    },
  };

  if (environment === 'production') {
    return {
      ...baseConfig,
      synchronize: false,
      logging: false,
      ssl: {
        rejectUnauthorized: false,
      },
      extra: {
        ...baseConfig.extra,
        ssl: {
          rejectUnauthorized: false,
        },
      },
      migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
      migrationsRun: true,
    };
  }

  return baseConfig;
};