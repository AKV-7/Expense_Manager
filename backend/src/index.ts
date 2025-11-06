import Fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import rateLimit from '@fastify/rate-limit';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'path';
import { config } from './config/env.js';
import { authRoutes } from './routes/authRoutes.js';
import { groupRoutes } from './routes/groupRoutes.js';
import { expenseRoutes } from './routes/expenseRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import { paymentRoutes } from './routes/paymentRoutes.js';
import { activityRoutes } from './routes/activityRoutes.js';
import { userRoutes } from './routes/userRoutes.js';
import { upiRoutes } from './routes/upiRoutes.js';
import { recurringExpenseRoutes } from './routes/recurringExpenseRoutes.js';
import { receiptRoutes } from './routes/receiptRoutes.js';
import { startRecurringScheduler } from './services/recurringScheduler.js';

const fastify = Fastify({ logger: true });

// Plugins
await fastify.register(cors, { origin: config.CORS_ORIGIN, credentials: true });
await fastify.register(jwt, { secret: config.JWT_SECRET });

// Multipart/form-data support for file uploads
await fastify.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

// Serve static files (uploaded receipts)
await fastify.register(fastifyStatic, {
  root: path.join(process.cwd(), 'uploads'),
  prefix: '/uploads/',
});

// Rate limiting - more permissive in development
const isDevelopment = process.env.NODE_ENV !== 'production';
await fastify.register(rateLimit, { 
  max: isDevelopment ? 10000 : 1000, 
  timeWindow: '1 minute',
  // Skip rate limiting for health check
  skipOnError: true
});

// Routes
fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }));
await fastify.register(authRoutes, { prefix: '/api/v1/auth' });
await fastify.register(userRoutes, { prefix: '/api/v1/user' });
await fastify.register(dashboardRoutes, { prefix: '/api/v1/dashboard' });
await fastify.register(groupRoutes, { prefix: '/api/v1/groups' });
await fastify.register(expenseRoutes, { prefix: '/api/v1/expenses' });
await fastify.register(paymentRoutes, { prefix: '/api/v1/payments' });
await fastify.register(activityRoutes, { prefix: '/api/v1/activities' });
await fastify.register(upiRoutes, { prefix: '/api/v1/upi' });
await fastify.register(recurringExpenseRoutes, { prefix: '/api/v1' });
await fastify.register(receiptRoutes, { prefix: '/api/v1' });

// Start server
const start = async () => {
  try {
    await fastify.listen({ port: config.PORT, host: '0.0.0.0' });
    console.log(`🚀 Server running on http://localhost:${config.PORT}`);
    
    // Start recurring expense scheduler
    startRecurringScheduler();
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
