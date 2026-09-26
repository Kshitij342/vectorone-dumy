import jwt, { SignOptions } from 'jsonwebtoken';

/**
 * Resolves the JWT secret at call time (not module load time) so that a
 * missing env var doesn't crash the entire serverless cold-start and kill
 * every route — it only fails on the specific endpoint that tries to sign/verify.
 */
function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'test') {
      return 'test-secret-key-vectorone-jest-environment';
    }
    throw new Error(
      'JWT_SECRET environment variable is not set. ' +
      'Add JWT_SECRET to your Vercel project environment variables.'
    );
  }
  if (process.env.NODE_ENV === 'production' && secret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long in production.');
  }
  return secret;
}

const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

export interface JwtPayload {
  userId: string;
  role: string;
  email: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, resolveJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, resolveJwtSecret()) as JwtPayload;
}
