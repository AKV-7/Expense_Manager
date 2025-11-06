import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { getUserId } from '../types/index.js';

export async function getDashboard(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = getUserId(request);

    const [groups, totalExpenses, balances] = await Promise.all([
      prisma.group.findMany({
        where: { members: { some: { userId } } },
        include: { _count: { select: { expenses: true, members: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      prisma.expense.aggregate({
        where: { participants: { some: { userId } } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.balance.findMany({
        where: { OR: [{ userId }, { owesToUserId: userId }] },
        include: { user: { select: { name: true } }, owesToUser: { select: { name: true } } },
      }),
    ]);

    const youOwe = balances.filter(b => b.userId === userId).reduce((sum, b) => sum + Number(b.amount), 0);
    const youAreOwed = balances.filter(b => b.owesToUserId === userId).reduce((sum, b) => sum + Number(b.amount), 0);

    reply.send({
      success: true,
      data: {
        stats: {
          totalGroups: groups.length,
          totalExpenses: totalExpenses._count,
          totalAmount: Number(totalExpenses._sum.amount || 0),
          youOwe,
          youAreOwed,
          netBalance: youAreOwed - youOwe,
        },
        recentGroups: groups,
        balances: balances.slice(0, 5),
      },
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    reply.status(500).send({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
}
