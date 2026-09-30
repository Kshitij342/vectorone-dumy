import { Router } from 'express';
import { register, login, logout, me, googleAuth, forgotPassword, resetPassword, tempSeedTestAccounts } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import { validateRequest } from '../middleware/validate';
import { registerSchema, loginSchema } from '../validators/auth.validator';

const router = Router();

router.post('/register', authRateLimiter, validateRequest(registerSchema), register);
router.post('/login', authRateLimiter, validateRequest(loginSchema), login);
router.post('/google', authRateLimiter, googleAuth);
router.post('/logout', authenticate, logout);
router.get('/me', authenticate, me);
router.post('/forgot-password', authRateLimiter, forgotPassword);
router.post('/reset-password', authRateLimiter, resetPassword);
router.get('/temp-seed-test-accounts', tempSeedTestAccounts);


export default router;
