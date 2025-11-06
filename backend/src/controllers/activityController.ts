import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { getUserId } from '../types/index.js';

export async function getActivities(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = getUserId(request);
    const { groupId } = request.query as { groupId?: string };

    const where = groupId 
      ? { groupId, group: { members: { some: { userId } } } }
      : { group: { members: { some: { userId } } } };

    const [expenses, payments] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: { creator: { select: { name: true } }, group: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.payment.findMany({
        where,
        include: { fromUser: { select: { name: true } }, toUser: { select: { name: true } }, group: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
    ]);

    const activities = [
      ...expenses.map(e => ({ type: 'expense', data: e, timestamp: e.createdAt })),
      ...payments.map(p => ({ type: 'payment', data: p, timestamp: p.createdAt })),
    ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20);

    reply.send({ success: true, data: activities });
  } catch (err) {
    console.error('Activity error:', err);
    reply.status(500).send({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
}
