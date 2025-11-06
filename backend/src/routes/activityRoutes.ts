import { FastifyInstance } from 'fastify';
import { getActivities } from '../controllers/activityController.js';
import { authenticate } from '../middleware/auth.js';

export async function activityRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: authenticate }, getActivities);
}
