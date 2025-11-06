import { FastifyInstance } from 'fastify';
import { createExpense, getExpenses, deleteExpense } from '../controllers/expenseController.js';
import { authenticate } from '../middleware/auth.js';

export async function expenseRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  fastify.post('/', createExpense);
  fastify.get('/group/:groupId', getExpenses);
  fastify.delete('/:id', deleteExpense);
}
