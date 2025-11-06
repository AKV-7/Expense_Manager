import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import {
  processReceipt,
  getReceiptById,
  getUserReceipts,
  deleteReceipt,
  linkReceiptToExpense,
} from '../services/ocrService.js';
import { validateUploadedFile, saveUploadedFile, getPublicUrl } from '../utils/upload.js';

/**
 * Upload receipt image
 */
export async function uploadReceipt(req: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = (req.user as any).id;

    // Get file from multipart
    const data = await req.file();

    if (!data) {
      return reply.status(400).send({
        success: false,
        error: { code: 'NO_FILE', message: 'No file uploaded' },
      });
    }

    // Validate file
    const validation = validateUploadedFile(data);
    if (!validation.valid) {
      return reply.status(400).send({
        success: false,
        error: { code: 'INVALID_FILE', message: validation.error },
      });
    }

    // Save file
    const savedFile = await saveUploadedFile(data);

    console.log(`📸 Receipt uploaded by user ${userId}: ${savedFile.originalName}`);

    // Create receipt record
    const receipt = await prisma.receipt.create({
      data: {
        userId,
        imageUrl: getPublicUrl(savedFile.filename),
        imagePath: savedFile.path,
        originalName: savedFile.originalName,
        mimeType: savedFile.mimeType,
        fileSize: savedFile.size,
        ocrStatus: 'pending',
      },
    });

    // Start OCR processing asynchronously (don't wait)
    processReceipt(receipt.id).catch((error) => {
      console.error(`Failed to process receipt ${receipt.id}:`, error);
    });

    reply.status(201).send({
      success: true,
      data: receipt,
      message: 'Receipt uploaded successfully. OCR processing started.',
    });
  } catch (error: any) {
    console.error('Upload receipt error:', error);
    reply.status(500).send({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to upload receipt' },
    });
  }
}

/**
 * Get receipt details
 */
export async function getReceipt(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: string };
    const userId = (req.user as any).id;

    const receipt = await getReceiptById(id);

    if (!receipt) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Receipt not found' },
      });
    }

    // Check permission
    if (receipt.userId !== userId) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' },
      });
    }

    reply.send({
      success: true,
      data: receipt,
    });
  } catch (error) {
    console.error('Get receipt error:', error);
    reply.status(500).send({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch receipt' },
    });
  }
}

/**
 * List user's receipts
 */
export async function listReceipts(req: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = (req.user as any).id;
    const { status, limit } = req.query as { status?: string; limit?: string };

    const receipts = await getUserReceipts(userId, {
      status,
      limit: limit ? parseInt(limit) : undefined,
    });

    reply.send({
      success: true,
      data: receipts,
      count: receipts.length,
    });
  } catch (error) {
    console.error('List receipts error:', error);
    reply.status(500).send({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to fetch receipts' },
    });
  }
}

/**
 * Delete receipt
 */
export async function removeReceipt(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: string };
    const userId = (req.user as any).id;

    // Check permission
    const receipt = await prisma.receipt.findUnique({
      where: { id },
    });

    if (!receipt) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Receipt not found' },
      });
    }

    if (receipt.userId !== userId) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' },
      });
    }

    await deleteReceipt(id);

    reply.send({
      success: true,
      message: 'Receipt deleted successfully',
    });
  } catch (error) {
    console.error('Delete receipt error:', error);
    reply.status(500).send({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to delete receipt' },
    });
  }
}

/**
 * Retry OCR processing
 */
export async function retryOCR(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: string };
    const userId = (req.user as any).id;

    // Check permission
    const receipt = await prisma.receipt.findUnique({
      where: { id },
    });

    if (!receipt) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Receipt not found' },
      });
    }

    if (receipt.userId !== userId) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' },
      });
    }

    // Start OCR processing
    const result = await processReceipt(id);

    reply.send({
      success: true,
      data: result,
      message: 'OCR processing completed',
    });
  } catch (error) {
    console.error('Retry OCR error:', error);
    reply.status(500).send({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to process receipt' },
    });
  }
}

const linkReceiptSchema = z.object({
  expenseId: z.string().uuid('Invalid expense ID'),
});

/**
 * Link receipt to expense
 */
export async function linkToExpense(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: string };
    const userId = (req.user as any).id;
    const body = req.body;

    const data = linkReceiptSchema.parse(body);

    // Check receipt permission
    const receipt = await prisma.receipt.findUnique({
      where: { id },
    });

    if (!receipt) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Receipt not found' },
      });
    }

    if (receipt.userId !== userId) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' },
      });
    }

    // Check expense exists and user has access
    const expense = await prisma.expense.findUnique({
      where: { id: data.expenseId },
      include: {
        group: {
          include: {
            members: true,
          },
        },
      },
    });

    if (!expense) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Expense not found' },
      });
    }

    const isMember = expense.group.members.some((m: any) => m.userId === userId);
    if (!isMember) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Not a member of this group' },
      });
    }

    // Link receipt to expense
    const updated = await linkReceiptToExpense(id, data.expenseId);

    reply.send({
      success: true,
      data: updated,
      message: 'Receipt linked to expense successfully',
    });
  } catch (error: any) {
    console.error('Link receipt error:', error);

    if (error.name === 'ZodError') {
      return reply.status(400).send({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: error.errors[0]?.message || 'Invalid input',
        },
      });
    }

    reply.status(500).send({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to link receipt' },
    });
  }
}

/**
 * Create expense from receipt
 */
export async function createExpenseFromReceipt(req: FastifyRequest, reply: FastifyReply) {
  try {
    const { id } = req.params as { id: string };
    const userId = (req.user as any).id;
    const { groupId } = req.body as { groupId: string };

    if (!groupId) {
      return reply.status(400).send({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Group ID is required' },
      });
    }

    // Check receipt
    const receipt = await getReceiptById(id);

    if (!receipt) {
      return reply.status(404).send({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Receipt not found' },
      });
    }

    if (receipt.userId !== userId) {
      return reply.status(403).send({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Access denied' },
      });
    }

    if (receipt.ocrStatus !== 'completed') {
      return reply.status(400).send({
        success: false,
        error: { code: 'OCR_NOT_READY', message: 'Receipt OCR processing not completed' },
      });
    }

    if (!receipt.totalAmount) {
      return reply.status(400).send({
        success: false,
        error: { code: 'NO_AMOUNT', message: 'No amount detected in receipt' },
      });
    }

    // Check group membership
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
        error: { code: 'NOT_MEMBER', message: 'Not a member of this group' },
      });
    }

    // Get all group members for equal split
    const members = await prisma.member.findMany({
      where: { groupId },
    });

    const numParticipants = members.length;
    const amountPerPerson = Number(receipt.totalAmount) / numParticipants;

    // Create expense
    const expense = await prisma.expense.create({
      data: {
        groupId,
        createdBy: userId,
        description: receipt.merchantName || 'Receipt Expense',
        amount: receipt.totalAmount,
        currency: receipt.currency || 'INR',
        date: receipt.date || new Date(),
        category: 'other',
        splitType: 'equal',
        receiptImageUrl: receipt.imageUrl,
        participants: {
          create: members.map((m: any) => ({
            userId: m.userId,
            paidAmount: m.userId === userId ? Number(receipt.totalAmount) : 0,
            owedAmount: amountPerPerson,
          })),
        },
      },
      include: {
        participants: true,
      },
    });

    // Link receipt to expense
    await linkReceiptToExpense(id, expense.id);

    // Update balances
    const { updateBalances } = await import('../services/balanceService.js');
    await updateBalances(groupId, [expense.id]);

    reply.status(201).send({
      success: true,
      data: expense,
      message: 'Expense created from receipt successfully',
    });
  } catch (error) {
    console.error('Create expense from receipt error:', error);
    reply.status(500).send({
      success: false,
      error: { code: 'SERVER_ERROR', message: 'Failed to create expense' },
    });
  }
}
