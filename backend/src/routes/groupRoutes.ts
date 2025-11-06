import { FastifyInstance } from 'fastify';
import { createGroup, getGroups, getGroup, addMember, deleteGroup, archiveGroup, unarchiveGroup, getArchivedGroups, getSimplifiedSettlements, recalculateBalances } from '../controllers/groupController.js';
import { authenticate } from '../middleware/auth.js';

export async function groupRoutes(fastify: FastifyInstance) {
  fastify.addHook('preHandler', authenticate);

  fastify.post('/', createGroup);
  fastify.get('/', getGroups);
  fastify.get('/archived', getArchivedGroups);
  fastify.get('/:id', getGroup);
  fastify.get('/:id/simplified-settlements', getSimplifiedSettlements);
  fastify.post('/:id/recalculate-balances', recalculateBalances);
  fastify.post('/:id/members', addMember);
  fastify.post('/:id/archive', archiveGroup);
  fastify.post('/:id/unarchive', unarchiveGroup);
  fastify.delete('/:id', deleteGroup);
}
