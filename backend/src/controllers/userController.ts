import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { hashPassword, comparePassword } from '../utils/auth.js';
import { getUserId } from '../types/index.js';

const updateProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  currencyPreference: z.string().optional(),
  profileImageUrl: z.string().url().optional().nullable(),
  upiId: z.string().optional().nullable(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword: z.string().min(8),
});

const updateNotificationPreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  expenseNotifications: z.boolean().optional(),
  paymentNotifications: z.boolean().optional(),
});

export async function updateProfile(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = getUserId(request);
    const data = updateProfileSchema.parse(request.body);

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, email: true, name: true, phone: true, currencyPreference: true },
    });

    reply.send({ success: true, data: user, message: 'Profile updated successfully' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: err.errors } });
    }
    console.error('Update profile error:', err);
    reply.status(500).send({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
}

export async function changePassword(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = getUserId(request);
    const { currentPassword, newPassword } = changePasswordSchema.parse(request.body);

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
    }

    const valid = await comparePassword(currentPassword, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Current password is incorrect' } });
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    reply.send({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: err.errors } });
    }
    console.error('Change password error:', err);
    reply.status(500).send({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
}

export async function searchUsers(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { q } = request.query as { q?: string };

    if (!q || q.trim().length < 2) {
      return reply.status(400).send({ 
        success: false, 
        error: { code: 'VALIDATION_ERROR', message: 'Search query must be at least 2 characters' } 
      });
    }

    const searchTerm = q.trim().toLowerCase();

    // Search users by email or name
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: { contains: searchTerm } },
          { name: { contains: searchTerm } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        profileImageUrl: true
      },
      take: 10 // Limit results
    });

    reply.send({ 
      success: true, 
      data: { users },
      message: `Found ${users.length} user(s)` 
    });
  } catch (err) {
    console.error('Search users error:', err);
    reply.status(500).send({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
}

export async function updateNotificationPreferences(request: FastifyRequest, reply: FastifyReply) {
  try {
    const userId = getUserId(request);
    const data = updateNotificationPreferencesSchema.parse(request.body);

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { 
        id: true, 
        emailNotifications: true, 
        expenseNotifications: true, 
        paymentNotifications: true 
      },
    });

    reply.send({ success: true, data: user, message: 'Notification preferences updated successfully' });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: err.errors } });
    }
    console.error('Update notification preferences error:', err);
    reply.status(500).send({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
}
