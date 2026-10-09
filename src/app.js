import path from 'path';
import express from 'express';
import helmet from 'helmet';
import compression from 'compression';
import cors from 'cors';
import cookieParser from 'cookie-parser';

import configRoutes from './routes/configRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import { generalRateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import { AppError } from './lib/errors.js';

export const app = express();

// Security headers with Helmet (allow cross-origin resource access for uploaded images)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' }
  })
);

// Response compression
app.use(compression());

// CORS configuration (limited to FRONTEND_ORIGIN with credentials)
const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
app.use(
  cors({
    origin: frontendOrigin,
    credentials: true
  })
);

// JSON body parser with strict 100 KB limit
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));

// Cookie parser for reading httpOnly auth token
app.use(cookieParser());

// Static file serving for uploads directory
const uploadsDir = path.resolve(process.cwd(), 'uploads');
app.use('/uploads', express.static(uploadsDir));

// Health check endpoints
const healthHandler = (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() });
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Apply general rate limiter across API routes
app.use('/api', generalRateLimiter);

// API route registrations under /api
app.use('/api/config', configRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', adminRoutes);

// 404 Handler
app.use((req, res, next) => {
  next(new AppError('ROUTE_NOT_FOUND', `Endpoint not found: ${req.method} ${req.originalUrl}`, 404));
});

// Central error handler
app.use(errorHandler);

export default app;
