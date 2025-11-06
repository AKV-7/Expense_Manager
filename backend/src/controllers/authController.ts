import { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { prisma } from '../utils/prisma.js';
import { getUserId } from '../types/index.js';
import { hashPassword, comparePassword } from '../utils/auth.js';
import { config } from '../config/env.js';
import { sendWelcomeEmail } from '../services/emailService.js';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2).max(100),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function register(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { email, password, name } = registerSchema.parse(request.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return reply.status(409).send({ success: false, error: { code: 'DUPLICATE_ENTRY', message: 'Email already exists' } });
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, passwordHash, name },
      select: { id: true, email: true, name: true, createdAt: true },
    });

    // Send welcome email (don't await - send asynchronously)
    sendWelcomeEmail(user.email, user.name).catch(err => 
      console.error('Failed to send welcome email:', err)
    );

    const token = request.server.jwt.sign({ id: user.id, email: user.email }, { expiresIn: '24h' });

    reply.status(201).send({
      success: true,
      data: { user, token, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
      message: 'Account created successfully',
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: err.errors } });
    }
    console.error('Registration error:', err);
    reply.status(500).send({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
}

export async function login(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { email, password } = loginSchema.parse(request.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Email not found' } });
    }

    const valid = await comparePassword(password, user.passwordHash);
    if (!valid) {
      return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid password' } });
    }

    const token = request.server.jwt.sign({ id: user.id, email: user.email }, { expiresIn: '24h' });

    reply.send({
      success: true,
      data: {
        user: { id: user.id, email: user.email, name: user.name, profileImageUrl: user.profileImageUrl },
        token,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return reply.status(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid input', details: err.errors } });
    }
    console.error('Login error:', err);
    reply.status(500).send({ success: false, error: { code: 'SERVER_ERROR', message: 'Internal server error' } });
  }
}

export async function getMe(request: FastifyRequest, reply: FastifyReply) {
  const userId = getUserId(request);
  
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { 
      id: true, 
      email: true, 
      name: true, 
      phone: true,
      upiId: true,
      profileImageUrl: true, 
      currencyPreference: true,
      emailNotifications: true,
      expenseNotifications: true,
      paymentNotifications: true,
      createdAt: true 
    },
  });

  if (!user) {
    return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'User not found' } });
  }

  console.log('✅ Sending user data:', user);
  reply.send({ success: true, data: user });
}

export async function googleAuth(request: FastifyRequest, reply: FastifyReply) {
  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${config.GOOGLE_CLIENT_ID}&` +
    `redirect_uri=${encodeURIComponent(config.GOOGLE_CALLBACK_URL)}&` +
    `response_type=code&` +
    `scope=profile email`;
  reply.redirect(authUrl);
}

export async function googleCallback(request: FastifyRequest, reply: FastifyReply) {
  try {
    const { code } = request.query as { code?: string };
    if (!code) {
      return reply.redirect('http://localhost:3000/login?error=oauth_failed');
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: config.GOOGLE_CLIENT_ID,
        client_secret: config.GOOGLE_CLIENT_SECRET,
        redirect_uri: config.GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code',
      }),
    });

    const tokens: any = await tokenResponse.json();
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const googleUser: any = await userInfoResponse.json();
    let user = await prisma.user.findUnique({ where: { email: googleUser.email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email: googleUser.email,
          name: googleUser.name || googleUser.email.split('@')[0],
          passwordHash: '', // Google OAuth users don't have passwords
        },
      });
    }

    const token = request.server.jwt.sign({ id: user.id, email: user.email }, { expiresIn: '24h' });
    reply.redirect(`http://localhost:3000/auth/callback?token=${token}`);
  } catch (error) {
    console.error('Google OAuth error:', error);
    reply.redirect('http://localhost:3000/login?error=oauth_failed');
  }
}
