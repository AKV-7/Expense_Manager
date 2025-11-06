import { FastifyInstance } from 'fastify';
import { updateProfile, changePassword, searchUsers, updateNotificationPreferences } from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';

export async function userRoutes(fastify: FastifyInstance) {
  fastify.put('/profile', { preHandler: authenticate }, updateProfile);
  fastify.put('/password', { preHandler: authenticate }, changePassword);
  fastify.put('/notifications', { preHandler: authenticate }, updateNotificationPreferences);
  fastify.get('/search', { preHandler: authenticate }, searchUsers);
}
