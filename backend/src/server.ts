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
const io = new SocketIOServer(server, {
  cors: {
    origin: (origin, callback) => {
      callback(null, true);
    },
    credentials: true,
  },
});

setupSocketIO(io);

server.listen(PORT, () => {
  logger.info(`🚀 VectorOne API Server running on port ${PORT}`);
  logger.info(`📄 Health check: http://localhost:${PORT}/api/health`);
  logger.info(`📚 API Docs: http://localhost:${PORT}/api/docs`);
});

export { app, server, io };
