import { FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../utils/prisma.js';
import { getUserId } from '../types/index.js';
import { 
  generateUPILink, 
  generateTransactionRef, 
  generateQRData,
  validateUPIId,
  parseSMS,
  formatAmount
} from '../utils/upi.js';

/**
 * Generate UPI Payment Link
 * Creates a UPI deep link for payment with transaction tracking
 */
export async function generatePaymentLink(request: FastifyRequest, reply: FastifyReply) {
  const userId = getUserId(request);
  const { toUserId, amount, groupId, note } = request.body as { 
    toUserId: string; 
    amount: number; 
    groupId: string;
    note?: string;
  };

  // Validate amount
  if (!amount || amount <= 0) {
    return reply.status(400).send({ 
      success: false, 
      error: { message: 'Invalid amount' } 
    });
  }

  // Get recipient details
  const toUser = await prisma.user.findUnique({ where: { id: toUserId } });
  if (!toUser) {
    return reply.status(404).send({ 
      success: false, 
      error: { message: 'Recipient not found' } 
    });
  }

  if (!toUser.upiId) {
    return reply.status(400).send({ 
      success: false, 
      error: { message: 'Recipient has no UPI ID set' } 
    });
  }

  // Validate UPI ID format
  if (!validateUPIId(toUser.upiId)) {
    return reply.status(400).send({ 
      success: false, 
      error: { message: 'Recipient has invalid UPI ID format' } 
    });
  }

  // Get payer details for the note
  const fromUser = await prisma.user.findUnique({ where: { id: userId } });
  
  // Generate unique identifiers
  const paymentId = `PAY_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  const transactionRef = generateTransactionRef(userId, paymentId);
  
  // Create payment note
  const paymentNote = note || `Payment from ${fromUser?.name || 'User'} - ${transactionRef}`;
  
  // Generate UPI link
  const upiLink = generateUPILink({
    upiId: toUser.upiId,
    name: toUser.name,
    amount,
    note: paymentNote,
    transactionRef,
  });

  // Generate QR code data (same as UPI link)
  const qrData = generateQRData({
    upiId: toUser.upiId,
    name: toUser.name,
    amount,
    note: paymentNote,
    transactionRef,
  });

  // Store pending payment for tracking
  await prisma.payment.create({
    data: {
      paymentId,
      groupId,
      fromUserId: userId,
      toUserId,
      amount,
      paymentMethod: 'upi',
      transactionId: transactionRef,
      status: 'pending',
      notes: paymentNote,
    },
  });

  reply.send({
    success: true,
    data: { 
      upiLink,
      qrData,
      paymentId, 
      transactionRef, 
      recipientName: toUser.name, 
      recipientUPI: toUser.upiId,
      amount,
      formattedAmount: formatAmount(amount),
      note: paymentNote,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes
    },
  });
}

/**
 * Generate QR Code for UPI Payment
 * Returns QR code data that can be rendered as image
 */
export async function generateQRCode(request: FastifyRequest, reply: FastifyReply) {
  const userId = getUserId(request);
  const { toUserId, amount, groupId, note } = request.body as { 
    toUserId: string; 
    amount: number; 
    groupId: string;
    note?: string;
  };

  // Get recipient details
  const toUser = await prisma.user.findUnique({ where: { id: toUserId } });
  if (!toUser || !toUser.upiId) {
    return reply.status(400).send({ 
      success: false, 
      error: { message: 'Recipient has no UPI ID set' } 
    });
  }

  const fromUser = await prisma.user.findUnique({ where: { id: userId } });
  const transactionRef = generateTransactionRef(userId);
  const paymentNote = note || `Payment from ${fromUser?.name || 'User'}`;

  const qrData = generateQRData({
    upiId: toUser.upiId,
    name: toUser.name,
    amount,
    note: paymentNote,
    transactionRef,
  });

  reply.send({
    success: true,
    data: { 
      qrData,
      recipientName: toUser.name,
      recipientUPI: toUser.upiId,
      amount,
      formattedAmount: formatAmount(amount),
      transactionRef,
    },
  });
}

/**
 * Confirm Payment
 * User manually confirms payment completion
 */
export async function confirmPayment(request: FastifyRequest, reply: FastifyReply) {
  const userId = getUserId(request);
  const { paymentId, upiRefNumber, screenshot } = request.body as {
    paymentId: string;
    upiRefNumber?: string;
    screenshot?: string;
  };

  // Find pending payment
  const payment = await prisma.payment.findUnique({
    where: { paymentId },
  });

  if (!payment) {
    return reply.status(404).send({ 
      success: false, 
      error: { message: 'Payment not found' } 
    });
  }

  if (payment.fromUserId !== userId) {
    return reply.status(403).send({ 
      success: false, 
      error: { message: 'Unauthorized' } 
    });
  }

  if (payment.status === 'completed') {
    return reply.status(400).send({ 
      success: false, 
      error: { message: 'Payment already confirmed' } 
    });
  }

  // Update payment status
  const updatedPayment = await prisma.payment.update({
    where: { paymentId },
    data: { 
      status: 'completed',
      transactionId: upiRefNumber || payment.transactionId,
      notes: screenshot ? `${payment.notes || ''}\nScreenshot: ${screenshot}` : payment.notes,
    },
  });

  // Update balance
  const balance = await prisma.balance.findUnique({
    where: { 
      groupId_userId_owesToUserId: { 
        groupId: payment.groupId, 
        userId: payment.fromUserId, 
        owesToUserId: payment.toUserId 
      } 
    },
  });

  if (balance) {
    const newAmount = Number(balance.amount) - Number(payment.amount);
    if (newAmount <= 0.01) {
      // Delete balance if settled
      await prisma.balance.delete({ where: { id: balance.id } });
    } else {
      // Update remaining balance
      await prisma.balance.update({ 
        where: { id: balance.id }, 
        data: { amount: newAmount } 
      });
    }
  }

  reply.send({ 
    success: true, 
    data: updatedPayment, 
    message: 'Payment confirmed successfully' 
  });
}

/**
 * Verify Payment via SMS
 * Auto-verify payment by parsing SMS content
 */
export async function verifyPaymentViaSMS(request: FastifyRequest, reply: FastifyReply) {
  const userId = getUserId(request);
  const { paymentId, smsText } = request.body as { 
    paymentId: string; 
    smsText: string;
  };

  // Find pending payment
  const payment = await prisma.payment.findUnique({
    where: { paymentId },
  });

  if (!payment) {
    return reply.status(404).send({ 
      success: false, 
      error: { message: 'Payment not found' } 
    });
  }

  if (payment.fromUserId !== userId) {
    return reply.status(403).send({ 
      success: false, 
      error: { message: 'Unauthorized' } 
    });
  }

  // Parse SMS
  const smsData = parseSMS(smsText);

  // Verify payment details match
  if (!smsData.success) {
    return reply.status(400).send({ 
      success: false, 
      error: { message: 'SMS does not indicate successful payment' } 
    });
  }

  if (smsData.amount && Math.abs(smsData.amount - Number(payment.amount)) > 0.01) {
    return reply.status(400).send({ 
      success: false, 
      error: { message: `Amount mismatch. Expected ₹${payment.amount}, found ₹${smsData.amount}` } 
    });
  }

  // Update payment with SMS details
  const updatedPayment = await prisma.payment.update({
    where: { paymentId },
    data: { 
      status: 'completed',
      transactionId: smsData.refNumber || payment.transactionId,
      notes: `${payment.notes || ''}\nVerified via SMS`,
    },
  });

  // Update balance (same as confirmPayment)
  const balance = await prisma.balance.findUnique({
    where: { 
      groupId_userId_owesToUserId: { 
        groupId: payment.groupId, 
        userId: payment.fromUserId, 
        owesToUserId: payment.toUserId 
      } 
    },
  });

  if (balance) {
    const newAmount = Number(balance.amount) - Number(payment.amount);
    if (newAmount <= 0.01) {
      await prisma.balance.delete({ where: { id: balance.id } });
    } else {
      await prisma.balance.update({ 
        where: { id: balance.id }, 
        data: { amount: newAmount } 
      });
    }
  }

  reply.send({ 
    success: true, 
    data: {
      payment: updatedPayment,
      smsData,
    }, 
    message: 'Payment verified via SMS' 
  });
}

/**
 * Get Payment Status
 * Check the status of a payment
 */
export async function getPaymentStatus(request: FastifyRequest, reply: FastifyReply) {
  const userId = getUserId(request);
  const { paymentId } = request.params as { paymentId: string };

  const payment = await prisma.payment.findUnique({
    where: { paymentId },
    include: {
      fromUser: { select: { id: true, name: true, email: true } },
      toUser: { select: { id: true, name: true, email: true, upiId: true } },
      group: { select: { id: true, name: true } },
    },
  });

  if (!payment) {
    return reply.status(404).send({ 
      success: false, 
      error: { message: 'Payment not found' } 
    });
  }

  // Check authorization
  if (payment.fromUserId !== userId && payment.toUserId !== userId) {
    return reply.status(403).send({ 
      success: false, 
      error: { message: 'Unauthorized' } 
    });
  }

  reply.send({ 
    success: true, 
    data: payment 
  });
}

/**
 * Cancel Payment
 * Cancel a pending payment
 */
export async function cancelPayment(request: FastifyRequest, reply: FastifyReply) {
  const userId = getUserId(request);
  const { paymentId } = request.params as { paymentId: string };

  const payment = await prisma.payment.findUnique({
    where: { paymentId },
  });

  if (!payment) {
    return reply.status(404).send({ 
      success: false, 
      error: { message: 'Payment not found' } 
    });
  }

  if (payment.fromUserId !== userId) {
    return reply.status(403).send({ 
      success: false, 
      error: { message: 'Unauthorized' } 
    });
  }

  if (payment.status !== 'pending') {
    return reply.status(400).send({ 
      success: false, 
      error: { message: 'Can only cancel pending payments' } 
    });
  }

  const updatedPayment = await prisma.payment.update({
    where: { paymentId },
    data: { status: 'cancelled' },
  });

  reply.send({ 
    success: true, 
    data: updatedPayment,
    message: 'Payment cancelled' 
  });
}

/**
 * Get Pending Payments
 * List all pending payments for the user
 */
export async function getPendingPayments(request: FastifyRequest, reply: FastifyReply) {
  const userId = getUserId(request);

  const payments = await prisma.payment.findMany({
    where: {
      fromUserId: userId,
      status: 'pending',
    },
    include: {
      toUser: { select: { id: true, name: true, email: true, upiId: true } },
      group: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  reply.send({ 
    success: true, 
    data: payments 
  });
}
