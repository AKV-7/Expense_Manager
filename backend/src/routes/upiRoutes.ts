import { FastifyInstance } from 'fastify';
import { 
  generatePaymentLink, 
  generateQRCode,
  confirmPayment, 
  verifyPaymentViaSMS,
  getPaymentStatus,
  cancelPayment,
  getPendingPayments
} from '../controllers/upiController.js';
import { authenticate } from '../middleware/auth.js';

export async function upiRoutes(fastify: FastifyInstance) {
  // Generate UPI payment link
  fastify.post('/generate-link', { preHandler: authenticate }, generatePaymentLink);
  
  // Generate QR code for payment
  fastify.post('/generate-qr', { preHandler: authenticate }, generateQRCode);
  
  // Confirm payment manually
  fastify.post('/confirm', { preHandler: authenticate }, confirmPayment);
  
  // Verify payment via SMS parsing
  fastify.post('/verify-sms', { preHandler: authenticate }, verifyPaymentViaSMS);
  
  // Get payment status
  fastify.get('/payment/:paymentId', { preHandler: authenticate }, getPaymentStatus);
  
  // Cancel pending payment
  fastify.delete('/payment/:paymentId', { preHandler: authenticate }, cancelPayment);
  
  // Get all pending payments for user
  fastify.get('/pending', { preHandler: authenticate }, getPendingPayments);
}
