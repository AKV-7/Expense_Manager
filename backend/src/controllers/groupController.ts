import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { recalculateGroupBalances } from '../services/recalculateBalances.js';
import { fixExpenseParticipants } from '../services/fixExpenseParticipants.js';
import { getUserId, getJWTPayload } from '../types/index.js';

const createGroupSchema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  category: z.enum(['trip', 'home', 'couple', 'friends', 'roommates', 'project', 'event', 'other']).default('other'),
  memberIds: z.array(z.string()).optional(),
});

export async function createGroup(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = getUserId(request);
    const { name, description, category, memberIds } = createGroupSchema.parse(request.body);

    const group = await prisma.group.create({
      data: {
        name,
        description,
        category,
        createdBy: userId,
        members: {
          create: [
            { userId, role: 'admin' },
            ...(memberIds || []).map(id => ({ userId: id, role: 'member' })),
          ],
        },
      },
      include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
    });

    reply.status(201).send({ success: true, data: group, message: 'Group created successfully' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: err.errors } });
    }
    reply.status(500).send({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
}

export async function getGroups(request: FastifyRequest, reply: FastifyReply) {
  const userId = getUserId(request);

  const groups = await prisma.group.findMany({
    where: { 
      members: { some: { userId } },
      isArchived: false, // Only show non-archived groups
    },
    include: {
      members: { include: { user: { select: { id: true, name: true } } } },
      _count: { select: { expenses: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  reply.send({ success: true, data: { groups } });
}

export async function getGroup(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const userId = getUserId(request);

  const group = await prisma.group.findFirst({
    where: { id, members: { some: { userId } } },
    include: {
      members: { include: { user: { select: { id: true, name: true, email: true, profileImageUrl: true, upiId: true } } } },
      balances: { include: { user: { select: { name: true, email: true, upiId: true } }, owesToUser: { select: { name: true, email: true, upiId: true } } } },
      _count: { select: { expenses: true } },
    },
  });

  if (!group) {
    return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Group not found' } });
  }

  reply.send({ success: true, data: group });
}

export async function addMember(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const { userId: newUserId, email } = request.body as { userId?: string; email?: string };
  const currentUserId = getUserId(request);

  // Check if current user is a member of the group
  const member = await prisma.member.findFirst({ where: { groupId: id, userId: currentUserId } });
  if (!member) {
    return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Not a group member' } });
  }

  let targetUserId = newUserId;

  // If email is provided instead of userId, look up the user
  if (email && !targetUserId) {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'User not found with this email' } });
    }
    targetUserId = user.id;
  }

  if (!targetUserId) {
    return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Either userId or email is required' } });
  }

  // Check if user is already a member
  const existing = await prisma.member.findFirst({ where: { groupId: id, userId: targetUserId } });
  if (existing) {
    return reply.status(409).send({ success: false, error: { code: 'CONFLICT', message: 'User already in group' } });
  }

  await prisma.member.create({ data: { groupId: id, userId: targetUserId, role: 'member' } });

  reply.status(201).send({ success: true, message: 'Member added successfully' });
}

export async function archiveGroup(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const userId = getUserId(request);

  const group = await prisma.group.findFirst({
    where: { id, createdBy: userId },
  });

  if (!group) {
    return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Group not found or not admin' } });
  }

  await prisma.group.update({
    where: { id },
    data: { isArchived: true },
  });

  reply.send({ success: true, message: 'Group archived successfully' });
}

export async function unarchiveGroup(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const userId = getUserId(request);

  const group = await prisma.group.findFirst({
    where: { id, createdBy: userId },
  });

  if (!group) {
    return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Group not found or not admin' } });
  }

  await prisma.group.update({
    where: { id },
    data: { isArchived: false },
  });

  reply.send({ success: true, message: 'Group restored successfully' });
}

export async function getArchivedGroups(request: FastifyRequest, reply: FastifyReply) {
  const userId = getUserId(request);

  const groups = await prisma.group.findMany({
    where: { 
      members: { some: { userId } },
      isArchived: true, // Only show archived groups
    },
    include: {
      members: { include: { user: { select: { id: true, name: true } } } },
      _count: { select: { expenses: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  reply.send({ success: true, data: { groups } });
}

export async function deleteGroup(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const userId = getUserId(request);
  const { autoSettle } = request.query as { autoSettle?: string };

  const group = await prisma.group.findFirst({
    where: { id, createdBy: userId },
    include: { 
      _count: { select: { expenses: true } },
      balances: true,
    },
  });

  if (!group) {
    return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Group not found or not admin' } });
  }

  // Check if there are any unsettled balances
  const hasUnsettledBalances = group.balances.some(balance => !balance.amount.equals(0));
  
  // If auto-settle is enabled, create payments to settle all balances
  if (hasUnsettledBalances && autoSettle === 'true') {
    console.log('🔄 Auto-settling balances before group deletion...');
    
    for (const balance of group.balances) {
      if (!balance.amount.equals(0)) {
        try {
          await prisma.payment.create({
            data: {
              paymentId: `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              groupId: id,
              fromUserId: balance.userId,
              toUserId: balance.owesToUserId,
              amount: balance.amount,
              paymentMethod: 'auto-settled',
              notes: 'Auto-settled before group deletion',
            },
          });
          
          // Update the balance to zero
          await prisma.balance.update({
            where: { id: balance.id },
            data: { amount: 0 },
          });
          
          console.log(`✅ Auto-settled: ${balance.userId} -> ${balance.owesToUserId}: ${balance.amount}`);
        } catch (err) {
          console.error('Error auto-settling balance:', err);
        }
      }
    }
  } else if (hasUnsettledBalances) {
    // If there are unsettled balances and auto-settle is not enabled, block deletion
    return reply.status(409).send({ 
      success: false, 
      error: { 
        code: 'UNSETTLED_BALANCES', 
        message: 'Cannot delete group with unsettled balances. Please settle all payments first or enable auto-settle.' 
      } 
    });
  }

  // Delete the group (cascade will delete expenses, balances, payments, etc.)
  await prisma.group.delete({ where: { id } });

  reply.send({ success: true, message: 'Group deleted successfully' });
}

export async function getSimplifiedSettlements(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = request.params as { id: string };
    const userId = getUserId(request);

    // Verify user is a member of the group
    const member = await prisma.member.findFirst({
      where: { groupId: id, userId }
    });

    if (!member) {
      return reply.status(403).send({ 
        success: false, 
        error: { code: 'FORBIDDEN', message: 'You are not a member of this group' } 
      });
    }

    // Import the service
    const { getSimplifiedDebts, getGroupUsersWithBalances } = await import('../services/simplifyDebtsService.js');
    
    // Get simplified transactions
    const simplifiedTransactions = await getSimplifiedDebts(id);
    
    // Get user balances for additional context
    const userBalances = await getGroupUsersWithBalances(id);

    reply.send({ 
      success: true, 
      data: {
        simplifiedTransactions,
        userBalances,
        message: simplifiedTransactions.length === 0 
          ? 'All settled up! No debts to pay.' 
          : `${simplifiedTransactions.length} optimized transaction${simplifiedTransactions.length > 1 ? 's' : ''} needed to settle all debts.`
      }
    });
  } catch (err) {
    console.error('Get simplified settlements error:', err);
    reply.status(500).send({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
}

export async function recalculateBalances(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { id: groupId } = request.params as { id: string };
    const userId = getUserId(request);

    // Verify user is a member
    const member = await prisma.member.findFirst({
      where: { groupId, userId }
    });

    if (!member) {
      return reply.status(403).send({ 
        success: false, 
        error: { code: 'FORBIDDEN', message: 'Not a group member' } 
      });
    }

    console.log(`User ${userId} requested balance recalculation for group ${groupId}`);
    
    // First, fix any expense participants with wrong paidAmount
    const fixResult = await fixExpenseParticipants(groupId);
    console.log(`Fixed ${fixResult.fixed} expense participants`);
    
    // Then recalculate balances
    const balances = await recalculateGroupBalances(groupId);

    reply.send({
      success: true,
      data: { balances, fixed: fixResult.fixed },
      message: `Balances recalculated successfully (fixed ${fixResult.fixed} expense records)`
    });
  } catch (err) {
    console.error('Recalculate balances error:', err);
    reply.status(500).send({ 
      success: false, 
      error: { code: 'SERVER_ERROR', message: 'Internal server error' } 
    });
  }
}
