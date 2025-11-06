import { FastifyInstance, FastifyRequest } from 'fastify';

/**
 * Extended FastifyRequest with JWT user payload
 */
export interface AuthenticatedRequest extends FastifyRequest {
  user: JWTPayload;
}

/**
 * JWT payload structure
 */
export interface JWTPayload {
  id: string;
  email: string;
  name: string;
  iat?: number;
  exp?: number;
}

/**
 * Type guard to check if a request is authenticated
 */
export function isAuthenticated(request: FastifyRequest): request is AuthenticatedRequest {
  return request.user !== undefined && typeof (request.user as any).id === 'string';
}

/**
 * Helper to safely extract user ID from request
 */
export function getUserId(request: FastifyRequest): string {
  const user = request.user as any;
  if (!user || typeof user.id !== 'string') {
    throw new Error('User not authenticated or invalid user structure');
  }
  return user.id;
}

/**
 * Helper to safely extract JWT payload from request
 */
export function getJWTPayload(request: FastifyRequest): JWTPayload {
  const user = request.user as any;
  if (!user || typeof user.id !== 'string' || typeof user.email !== 'string') {
    throw new Error('User not authenticated or invalid user structure');
  }
  return user as JWTPayload;
}
