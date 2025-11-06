import { FastifyInstance } from 'fastify';
import {
  createRecurring,
  getGroupRecurring,
  getRecurringById,
  updateRecurring,
  cancelRecurring,
  triggerRecurringNow,
} from '../controllers/recurringExpenseController.js';
import { authenticate } from '../middleware/auth.js';

export async function recurringExpenseRoutes(fastify: FastifyInstance) {
  // Create recurring expense
  fastify.post('/groups/:groupId/recurring', { preHandler: authenticate }, createRecurring);

  // Get group's recurring expenses
  fastify.get('/groups/:groupId/recurring', { preHandler: authenticate }, getGroupRecurring);

  // Get single recurring expense
  fastify.get('/recurring/:id', { preHandler: authenticate }, getRecurringById);

  // Update recurring expense
  fastify.put('/recurring/:id', { preHandler: authenticate }, updateRecurring);

  // Cancel recurring expense
  fastify.delete('/recurring/:id', { preHandler: authenticate }, cancelRecurring);

  // Manual trigger (admin/dev only - can add admin check)
  fastify.post('/recurring/process', { preHandler: authenticate }, triggerRecurringNow);
}
