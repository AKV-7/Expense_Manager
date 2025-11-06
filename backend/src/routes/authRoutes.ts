import { FastifyInstance } from 'fastify';
import { register, login, getMe, googleAuth, googleCallback } from '../controllers/authController.js';
import { authenticate } from '../middleware/auth.js';

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/register', register);
  fastify.post('/login', login);
  fastify.get('/me', { preHandler: authenticate }, getMe);
  fastify.get('/google', googleAuth);
  fastify.get('/google/callback', googleCallback);
}
