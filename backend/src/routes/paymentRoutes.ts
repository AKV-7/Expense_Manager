import { FastifyInstance } from 'fastify';
import { createPayment, getGroupPayments } from '../controllers/paymentController.js';
import { authenticate } from '../middleware/auth.js';

export async function paymentRoutes(fastify: FastifyInstance) {
  fastify.post('/', { preHandler: authenticate }, createPayment);
  fastify.get('/group/:groupId', { preHandler: authenticate }, getGroupPayments);
}
