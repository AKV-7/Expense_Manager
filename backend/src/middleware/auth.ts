import { FastifyRequest, FastifyReply } from 'fastify';
import type { AuthenticatedRequest, JWTPayload } from '../types/index.js';

/**
 * Authentication middleware that verifies JWT token
 * Adds verified user payload to request.user
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    // JWT verification is handled by Fastify JWT plugin
    // This will throw if token is invalid or missing
    await request.jwtVerify();
    
    // At this point, request.user is populated with JWT payload
    // Type assertion is safe here because jwtVerify succeeded
    const user = request.user as unknown as JWTPayload;
    
    if (!user.id || !user.email) {
      throw new Error('Invalid JWT payload: missing required fields');
    }
  } catch (err) {
    reply.status(401).send({ 
      success: false, 
      error: { 
        code: 'UNAUTHORIZED', 
        message: err instanceof Error ? err.message : 'Invalid token' 
      } 
    });
  }
}
