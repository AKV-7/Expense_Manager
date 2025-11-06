import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import {
  createRecurringExpense,
  updateRecurringExpense,
  cancelRecurringExpense,
  getGroupRecurringExpenses,
  processRecurringExpenses,
  getFrequencyDisplay,
} from '../services/recurringExpenseService.js';

const createRecurringSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  amount: z.number().positive('Amount must be positive'),
  category: z.string().optional(),
  payerId: z.string().uuid('Invalid payer ID'),
  splitType: z.enum(['equal', 'percentage', 'shares']).default('equal'),
  splitData: z.any().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']),
  interval: z.number().int().positive().default(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  timezone: z.string().default('Asia/Kolkata'),
});

const updateRecurringSchema = z.object({
  title: z.string().min(1).optional(),
  amount: z.number().positive().optional(),
  category: z.string().optional(),
  payerId: z.string().uuid().optional(),
  splitType: z.enum(['equal', 'percentage', 'shares']).optional(),
  splitData: z.any().optional(),
  frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly']).optional(),
  interval: z.number().int().positive().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  timezone: z.string().optional(),
  active: z.boolean().optional(),
});

export async function createRecurring(req: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = (req.user as any).id;
    const { groupId } = req.params as { groupId: string };
    const body = req.body;
    
    const data = createRecurringSchema.parse(body);

    // Verify user is a member of the group
    const { prisma } = await import('../utils/prisma.js');
    const member = await prisma.member.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!member) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You must be a member of this group',
        },
      });
    }

    const recurring = await createRecurringExpense({
      ...data,
      groupId,
      createdBy: userId,
      startDate: new Date(data.startDate),
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    });

    reply.status(201).send({
      success: true,
      data: recurring,
      message: `Recurring expense created: ${getFrequencyDisplay(recurring.frequency, recurring.interval)}`,
    });
  } catch (err: any) {
    console.error('Create recurring expense error:', err);
    
    if (err.name === 'ZodError') {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: err.errors[0]?.message || 'Invalid input',
        },
      });
    }
    
    reply.status(500).send({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create recurring expense' },
    });
  }
}

export async function getGroupRecurring(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { groupId } = req.params as { groupId: string };
    const userId = (req.user as any).id;

    // Verify user is a member of the group
    const { prisma } = await import('../utils/prisma.js');
    const member = await prisma.member.findUnique({
      where: {
        groupId_userId: {
          groupId,
          userId,
        },
      },
    });

    if (!member) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You must be a member of this group',
        },
      });
    }

    const recurring = await getGroupRecurringExpenses(groupId);

    reply.send({
      success: true,
      data: recurring,
    });
  } catch (err) {
    console.error('Get recurring expenses error:', err);
    reply.status(500).send({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch recurring expenses' },
    });
  }
}

export async function getRecurringById(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: string };
    const userId = (req.user as any).id;

    const { prisma } = await import('../utils/prisma.js');
    const recurring = await prisma.recurringExpense.findUnique({
      where: { id },
      include: {
        group: true,
        creator: {
          select: { id: true, name: true, email: true },
        },
        payer: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!recurring) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Recurring expense not found' },
      });
    }

    // Verify user is a member of the group
    const member = await prisma.member.findUnique({
      where: {
        groupId_userId: {
          groupId: recurring.groupId,
          userId,
        },
      },
    });

    if (!member) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You must be a member of this group',
        },
      });
    }

    reply.send({
      success: true,
      data: recurring,
    });
  } catch (err) {
    console.error('Get recurring expense error:', err);
    reply.status(500).send({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch recurring expense' },
    });
  }
}

export async function updateRecurring(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: string };
    const userId = (req.user as any).id;
    const body = req.body;
    
    const updates = updateRecurringSchema.parse(body);

    // Verify user is the creator or member of the group
    const { prisma } = await import('../utils/prisma.js');
    const existing = await prisma.recurringExpense.findUnique({
      where: { id },
      include: { group: true },
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Recurring expense not found' },
      });
    }

    const member = await prisma.member.findUnique({
      where: {
        groupId_userId: {
          groupId: existing.groupId,
          userId,
        },
      },
    });

    if (!member && existing.createdBy !== userId) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to update this recurring expense',
        },
      });
    }

    const updateData: any = { ...updates };
    if (updates.startDate) {
      updateData.startDate = new Date(updates.startDate);
    }
    if (updates.endDate) {
      updateData.endDate = new Date(updates.endDate);
    }

    const recurring = await updateRecurringExpense(id, updateData);

    reply.send({
      success: true,
      data: recurring,
      message: 'Recurring expense updated successfully',
    });
  } catch (err: any) {
    console.error('Update recurring expense error:', err);
    
    if (err.name === 'ZodError') {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: err.errors[0]?.message || 'Invalid input',
        },
      });
    }
    
    reply.status(500).send({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to update recurring expense' },
    });
  }
}

export async function cancelRecurring(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: string };
    const userId = (req.user as any).id;

    // Verify user is the creator or member of the group
    const { prisma } = await import('../utils/prisma.js');
    const existing = await prisma.recurringExpense.findUnique({
      where: { id },
    });

    if (!existing) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Recurring expense not found' },
      });
    }

    const member = await prisma.member.findUnique({
      where: {
        groupId_userId: {
          groupId: existing.groupId,
          userId,
        },
      },
    });

    if (!member && existing.createdBy !== userId) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to cancel this recurring expense',
        },
      });
    }

    await cancelRecurringExpense(id);

    reply.send({
      success: true,
      message: 'Recurring expense cancelled successfully',
    });
  } catch (err) {
    console.error('Cancel recurring expense error:', err);
    reply.status(500).send({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to cancel recurring expense' },
    });
  }
}

export async function triggerRecurringNow(req: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = (req.user as any).id;

    // Optional: Add admin check here
    console.log(`Manual trigger by user: ${userId}`);

    const results = await processRecurringExpenses();

    reply.send({
      success: true,
      data: { results, processed: results.length },
      message: `Processed ${results.length} recurring expenses`,
    });
  } catch (err) {
    console.error('Trigger recurring error:', err);
    reply.status(500).send({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to process recurring expenses' },
    });
  }
}
