import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { getUserId } from '../types/index.js';
import { calculateSplits } from '../services/splitService.js';
import { updateBalances } from '../services/balanceService.js';
import { sendExpenseNotification } from '../services/emailService.js';

const createExpenseSchema = z.object({
  groupId: z.string(),
  description: z.string().min(3).max(255),
  amount: z.number().positive(),
  category: z.enum(['food', 'transport', 'entertainment', 'shopping', 'utilities', 'housing', 'travel', 'other']).default('other'),
  splitType: z.enum(['equal', 'percentage', 'exact', 'shares']).default('equal'),
  payerId: z.string(),
  createdAt: z.string().optional(), // Accept optional date string
  participants: z.array(z.object({
    userId: z.string(),
    sharePercentage: z.number().optional(),
    owedAmount: z.number().optional(),
    shareCount: z.number().optional(),
  })).min(1),
});

/**
 * Send expense notification emails to all participants
 */
async function sendExpenseNotifications(expense: any, groupId: string, payerId: string) {
  try {
    // Get group details and payer name
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { name: true }
    });

    const payer = await prisma.user.findUnique({
      where: { id: payerId },
      select: { name: true }
    });

    if (!group || !payer) return;

    // Get all participants
    const participants = await prisma.expenseParticipant.findMany({
      where: { expenseId: expense.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          }
        }
      }
    });

    // Send email to each participant (except the payer)
    for (const participant of participants) {
      // Skip payer
      if (participant.userId === payerId) continue;

      // TODO: Check user email preferences once Prisma schema is updated
      // For now, send to everyone

      await sendExpenseNotification(
        participant.user.email,
        participant.user.name,
        {
          description: expense.description,
          amount: expense.amount,
          paidBy: payer.name,
          groupName: group.name,
          yourShare: Number(participant.owedAmount),
        }
      );
    }
  } catch (error) {
    console.error('Error sending expense notifications:', error);
  }
}

export async function createExpense(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = getUserId(request);
    const data = createExpenseSchema.parse(request.body);

    const member = await prisma.member.findFirst({ where: { groupId: data.groupId, userId } });
    if (!member) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Not a group member' } });
    }

    const splits = calculateSplits(data.amount, data.splitType, data.participants);

    // Create expense and participants in a transaction
    const expense = await prisma.$transaction(async (tx) => {
      // Create expense
      const exp = await tx.expense.create({
        data: {
          description: data.description,
          amount: data.amount,
          groupId: data.groupId,
          createdBy: data.payerId,
          category: data.category,
          splitType: data.splitType,
          ...(data.createdAt && { createdAt: new Date(data.createdAt) }), // Use provided date if available
        },
      });

      // Create expense participants with paidAmount
      const participantData = splits.map((split: any) => ({
        expenseId: exp.id,
        userId: split.userId,
        paidAmount: split.userId === data.payerId ? data.amount : 0, // Who paid gets full amount
        owedAmount: split.owedAmount,
      }));

      await tx.expenseParticipant.createMany({
        data: participantData,
      });

      // Return created expense with participants
      return {
        expense: await tx.expense.findUnique({
          where: { id: exp.id },
          include: {
            participants: {
              include: {
                user: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        }),
        participantData,
      };
    });

    // Update balances OUTSIDE the transaction (can be slower without blocking)
    // This is safe because balance updates are idempotent
    // Add groupId here since updateBalances needs it but ExpenseParticipant doesn't store it
    await updateBalances(
      expense.expense!.id,
      expense.participantData.map(p => ({ ...p, groupId: data.groupId }))
    );

    // Send email notifications to all participants (async, don't await)
    // DISABLED: Email notifications on every expense added
    // sendExpenseNotifications(expense.expense!, data.groupId, data.payerId).catch(err =>
    //   console.error('Failed to send expense notifications:', err)
    // );

    reply.status(201).send({ success: true, data: expense.expense, message: 'Expense created successfully' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: err.errors } });
    }
    console.error(err);
    reply.status(500).send({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
}

export async function getExpenses(request: FastifyRequest, reply: FastifyReply) {
  const { groupId } = request.params as { groupId: string };
  const userId = getUserId(request);

  const member = await prisma.member.findFirst({ where: { groupId, userId } });
  if (!member) {
    return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Not a group member' } });
  }

  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: {
      group: { select: { id: true, name: true } },
      creator: { select: { id: true, name: true, email: true } },
      participants: { include: { user: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: 'desc' },
  });

  reply.send({ success: true, data: { expenses } });
}

export async function deleteExpense(request: FastifyRequest, reply: FastifyReply) {
  const { id } = request.params as { id: string };
  const userId = getUserId(request);

  const expense = await prisma.expense.findFirst({ where: { id, createdBy: userId } });
  if (!expense) {
    return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Expense not found or not creator' } });
  }

  await prisma.expense.delete({ where: { id } });

  reply.send({ success: true, message: 'Expense deleted successfully' });
}
