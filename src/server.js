import 'dotenv/config';
import app from './app.js';
import { logger } from './lib/logger.js';

// Verify critical security configuration
const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret || jwtSecret.length < 32) {
  console.error('FATAL: JWT_SECRET is missing or shorter than 32 characters. Server refusing to start.');
  process.exit(1);
}

const PORT = parseInt(process.env.PORT, 10) || 4000;

const server = app.listen(PORT, () => {
  logger.info(`The Wanted Backend API server running on port ${PORT}`);
  logger.info(`Base API URL: http://localhost:${PORT}/api`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    process.exit(0);
  });
});
