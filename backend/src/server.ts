import http from 'http';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';

dotenv.config();

import { createApp } from './app';
import { setupSocketIO } from './sockets';
import { logger } from './utils/logger';

const PORT = process.env.PORT || 5000;
const app = createApp();
const server = http.createServer(app);

// Setup Socket.IO
const defaultDevOrigins = 'http://localhost:3000,http://127.0.0.1:5500,http://localhost:5500,http://127.0.0.1:5501,http://localhost:5501';
const socketCorsOrigins = (process.env.CORS_ORIGINS || defaultDevOrigins)
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      if (!origin || socketCorsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
});

setupSocketIO(io);
app.set('io', io);

server.listen(PORT, () => {
  logger.info(`🚀 VectorOne API Server running on port ${PORT}`);
  logger.info(`📄 Health check: http://localhost:${PORT}/api/health`);
  logger.info(`📚 API Docs: http://localhost:${PORT}/api/docs`);
});

export { app, server, io };
