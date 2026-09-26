import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import path from 'path';

import authRoutes from './routes/auth.routes';
import studentRoutes from './routes/student.routes';
import adminRoutes from './routes/admin.routes';
import { authenticate } from './middleware/auth';
import { errorHandler, notFound } from './middleware/errorHandler';
import { generalRateLimiter } from './middleware/rateLimiter';

export function createApp(): Express {
  const app = express();

  // Security HTTP headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // CORS setup — strict origin matching
  const defaultDevOrigins = 'http://localhost:3000,http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:5501,http://localhost:5501';
  const corsOrigins = (process.env.CORS_ORIGINS || defaultDevOrigins)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  // Always allow the configured FRONTEND_URL (covers Vercel production domain)
  if (process.env.FRONTEND_URL && !corsOrigins.includes(process.env.FRONTEND_URL)) {
    corsOrigins.push(process.env.FRONTEND_URL.trim());
  }

  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (server-to-server, Vercel health probes, mobile apps)
        if (!origin) {
          callback(null, true);
          return;
        }
        // Allow exact matches from the list
        if (corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }
        // Allow any *.vercel.app deployment of this project
        // Covers both old slug (vectorone-dumy-*) and new slug (vectorone-three, vectorone-*)
        if (/^https:\/\/vectorone[a-z0-9-]*\.vercel\.app$/.test(origin)) {
          callback(null, true);
          return;
        }
        callback(new Error(`CORS: origin '${origin}' not allowed`));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    })
  );

  // Compress responses
  app.use(compression());

  // Logging
  if (process.env.NODE_ENV !== 'test') {
    app.use(morgan('dev'));
  }

  // Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Serve static uploads (protected by authentication)
  const uploadDir = process.env.UPLOAD_DIR || './uploads';
  app.use('/uploads', authenticate, express.static(path.resolve(uploadDir)));

  // General rate limiter
  app.use(['/api', '/'], generalRateLimiter);

  // Health check
  app.get(['/api/health', '/health'], (_req, res) => {
    res.json({
      success: true,
      service: 'VectorOne API',
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  });

  // API Documentation placeholder / spec
  app.get(['/api/docs', '/docs'], (_req, res) => {
    res.json({
      service: 'VectorOne College Management API',
      version: '1.0.0',
      description: 'API documentation for VectorOne CMS',
      endpoints: {
        auth: ['POST /api/auth/register', 'POST /api/auth/login', 'POST /api/auth/logout', 'GET /api/auth/me'],
        student: ['GET /api/dashboard', 'GET /api/notices', 'GET /api/events', 'GET /api/assignments', 'GET /api/resources', 'GET /api/messages', 'GET /api/profile', 'GET /api/settings', 'GET /api/notifications'],
        admin: ['GET /api/admin/dashboard', 'GET /api/admin/students', 'GET /api/admin/faculty', 'GET /api/admin/departments', 'GET /api/admin/courses', 'GET /api/admin/attendance', 'GET /api/admin/notices', 'GET /api/admin/events', 'GET /api/admin/assignments', 'GET /api/admin/resources', 'GET /api/admin/messages', 'GET /api/admin/reports/*', 'GET /api/admin/analytics/*'],
      },
    });
  });

  // Mount API Routes (supports both /api/* and stripped /* path prefixes from Vercel Functions)
  app.use('/api/auth', authRoutes);
  app.use('/auth', authRoutes);

  app.use('/api/admin', adminRoutes);
  app.use('/admin', adminRoutes);

  app.use('/api', studentRoutes);
  app.use('/', studentRoutes);

  // 404 & Error Handling
  app.use(notFound);
  app.use(errorHandler);

  return app;
}
