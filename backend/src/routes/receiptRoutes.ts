import { FastifyInstance } from 'fastify';
import { authenticate } from '../middleware/auth.js';
import {
  uploadReceipt,
  getReceipt,
  listReceipts,
  removeReceipt,
  retryOCR,
  linkToExpense,
  createExpenseFromReceipt,
} from '../controllers/receiptController.js';

export async function receiptRoutes(fastify: FastifyInstance) {
  /**
   * Upload receipt
   * POST /receipts/upload
   */
  fastify.post(
    '/receipts/upload',
    {
      preHandler: [authenticate],
    },
    uploadReceipt
  );

  /**
   * List user's receipts
   * GET /receipts
   */
  fastify.get(
    '/receipts',
    {
      preHandler: [authenticate],
    },
    listReceipts
  );

  /**
   * Get receipt details
   * GET /receipts/:id
   */
  fastify.get(
    '/receipts/:id',
    {
      preHandler: [authenticate],
    },
    getReceipt
  );

  /**
   * Delete receipt
   * DELETE /receipts/:id
   */
  fastify.delete(
    '/receipts/:id',
    {
      preHandler: [authenticate],
    },
    removeReceipt
  );

  /**
   * Retry OCR processing
   * POST /receipts/:id/process
   */
  fastify.post(
    '/receipts/:id/process',
    {
      preHandler: [authenticate],
    },
    retryOCR
  );

  /**
   * Link receipt to expense
   * PUT /receipts/:id/link
   */
  fastify.put(
    '/receipts/:id/link',
    {
      preHandler: [authenticate],
    },
    linkToExpense
  );

  /**
   * Create expense from receipt
   * POST /receipts/:id/create-expense
   */
  fastify.post(
    '/receipts/:id/create-expense',
    {
      preHandler: [authenticate],
    },
    createExpenseFromReceipt
  );
}
