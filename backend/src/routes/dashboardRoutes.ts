import { FastifyInstance } from 'fastify';
import { getDashboard } from '../controllers/dashboardController.js';
import { authenticate } from '../middleware/auth.js';

export default async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.get('/', { preHandler: authenticate }, getDashboard);
}
