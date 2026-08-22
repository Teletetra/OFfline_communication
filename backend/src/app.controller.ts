export default () => ({
  app: { port: Number(process.env.PORT || 5000), env: process.env.NODE_ENV || 'development', frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173' },
  jwt: { secret: process.env.JWT_SECRET || 'development-secret', expiresIn: process.env.JWT_EXPIRES_IN || '15m', refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' },
  redis: { host: process.env.REDIS_HOST || 'localhost', port: Number(process.env.REDIS_PORT || 6379), password: process.env.REDIS_PASSWORD || undefined },
  upload: { directory: process.env.UPLOAD_DIR || 'uploads', maxFileSize: Number(process.env.MAX_FILE_SIZE || 10485760) },
  websocket: { path: process.env.WS_PATH || '/chat' },
});