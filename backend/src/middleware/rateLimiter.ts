import rateLimit from 'express-rate-limit';

const WINDOW_MS = parseInt(process.env.AUTH_RATE_LIMIT_WINDOW_MS || '900000', 10); // 15 min
const MAX = parseInt(process.env.AUTH_RATE_LIMIT_MAX || '20', 10);

export const authRateLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: MAX,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 200,
  message: {
    success: false,
    message: 'Too many requests, please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
