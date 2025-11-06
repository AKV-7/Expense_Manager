import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { getUserId } from '../types/index.js';
import { sendPaymentConfirmation } from '../services/emailService.js';

const createPaymentSchema = z.object({
  groupId: z.string().uuid(),
  toUserId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMethod: z.string().default('cash'),
  notes: z.string().optional(),
});

/**
 * Send payment confirmation emails to payer and recipient
 */
async function sendPaymentConfirmationEmails(
  payment: any,
  groupId: string,
  fromUserId: string,
  toUserId: string,
  paymentMethod: string
) {
  try {
    // Get group, payer, and recipient details
    const [group, fromUser, toUser] = await Promise.all([
      prisma.group.findUnique({ where: { id: groupId }, select: { name: true } }),
      prisma.user.findUnique({ where: { id: fromUserId }, select: { name: true, email: true } }),
      prisma.user.findUnique({ where: { id: toUserId }, select: { name: true, email: true } }),
    ]);

    if (!group || !fromUser || !toUser) return;

    // Send confirmation to payer (from user)
    await sendPaymentConfirmation(
      fromUser.email,
      fromUser.name,
      {
        amount: Number(payment.amount),
        paidTo: toUser.name,
        groupName: group.name,
        method: paymentMethod,
      }
    );

    // TODO: Also send notification to recipient once we add payment received template
  } catch (error) {
    console.error('Error sending payment confirmations:', error);
  }
}

export async function createPayment(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = getUserId(request);
    const { groupId, toUserId, amount, paymentMethod, notes } = createPaymentSchema.parse(request.body);

    const member = await prisma.member.findFirst({ where: { groupId, userId } });
    if (!member) {
      return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Not a group member' } });
    }

    const payment = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          paymentId: `PAY-${Date.now()}`,
          groupId,
          fromUserId: userId,
          toUserId,
          amount,
          paymentMethod,
          notes,
        },
      });

      const balance = await tx.balance.findUnique({
        where: { groupId_userId_owesToUserId: { groupId, userId, owesToUserId: toUserId } },
      });

      if (balance) {
        const newAmount = Number(balance.amount) - amount;
        if (newAmount <= 0) {
          await tx.balance.delete({ where: { id: balance.id } });
        } else {
          await tx.balance.update({ where: { id: balance.id }, data: { amount: newAmount } });
        }
      }

      return payment;
    });

    // Send payment confirmation emails (async, don't await)
    sendPaymentConfirmationEmails(payment, groupId, userId, toUserId, paymentMethod).catch((err: any) =>
      console.error('Failed to send payment confirmation:', err)
    );

    reply.status(201).send({ success: true, data: payment });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: err.errors } });
    }
    console.error('Payment error:', err);
    reply.status(500).send({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
}

export async function getGroupPayments(request: FastifyRequest, reply: FastifyReply) {
  const { groupId } = request.params as { groupId: string };
  const userId = getUserId(request);

  const member = await prisma.member.findFirst({ where: { groupId, userId } });
  if (!member) {
    return reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Not a group member' } });
  }

  const payments = await prisma.payment.findMany({
    where: { groupId },
    include: { fromUser: { select: { name: true } }, toUser: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
  });

  reply.send({ success: true, data: payments });
}
