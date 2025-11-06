import { prisma } from '../utils/prisma.js';
import { sendExpenseNotification } from './emailService.js';

interface RecurringExpenseData {
  groupId: string;
  createdBy: string;
  title: string;
  amount: number;
  category?: string;
  payerId: string;
  splitType: string;
  splitData?: any;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval?: number;
  startDate: Date;
  endDate?: Date;
  timezone?: string;
}

export async function createRecurringExpense(data: RecurringExpenseData) {
  const nextRunDate = calculateNextRunDate(
    data.startDate,
    data.frequency,
    data.interval || 1
  );

  const recurring = await prisma.recurringExpense.create({
    data: {
      groupId: data.groupId,
      createdBy: data.createdBy,
      title: data.title,
      amount: data.amount,
      category: data.category,
      payerId: data.payerId,
      splitType: data.splitType,
      splitData: data.splitData ? JSON.stringify(data.splitData) : null,
      frequency: data.frequency,
      interval: data.interval || 1,
      startDate: data.startDate,
      endDate: data.endDate,
      nextRunDate,
      timezone: data.timezone || 'Asia/Kolkata',
    },
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

  return recurring;
}

export async function updateRecurringExpense(
  id: string,
  updates: Partial<RecurringExpenseData>
) {
  const updateData: any = { ...updates };
  
  if (updates.splitData) {
    updateData.splitData = JSON.stringify(updates.splitData);
  }
  
  // Recalculate next run date if frequency or interval changed
  if (updates.frequency || updates.interval || updates.startDate) {
    const current = await prisma.recurringExpense.findUnique({
      where: { id },
    });
    
    if (current) {
      updateData.nextRunDate = calculateNextRunDate(
        updates.startDate || current.startDate,
        updates.frequency || current.frequency,
        updates.interval || current.interval
      );
    }
  }

  const recurring = await prisma.recurringExpense.update({
    where: { id },
    data: updateData,
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

  return recurring;
}

export async function cancelRecurringExpense(id: string) {
  return await prisma.recurringExpense.update({
    where: { id },
    data: { active: false },
  });
}

export async function getGroupRecurringExpenses(groupId: string) {
  return await prisma.recurringExpense.findMany({
    where: { groupId, active: true },
    include: {
      creator: {
        select: { id: true, name: true, email: true },
      },
      payer: {
        select: { id: true, name: true, email: true },
      },
      group: {
        select: { id: true, name: true },
      },
    },
    orderBy: { nextRunDate: 'asc' },
  });
}

export function calculateNextRunDate(
  currentDate: Date,
  frequency: string,
  interval: number
): Date {
  const next = new Date(currentDate);

  switch (frequency) {
    case 'daily':
      next.setDate(next.getDate() + interval);
      break;
    case 'weekly':
      next.setDate(next.getDate() + interval * 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + interval);
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + interval);
      break;
  }

  return next;
}

export async function processRecurringExpenses() {
  const now = new Date();
  
  // Find all active recurring expenses that are due
  const dueExpenses = await prisma.recurringExpense.findMany({
    where: {
      active: true,
      nextRunDate: { lte: now },
    },
    include: {
      group: {
        include: {
          members: {
            include: {
              user: true,
            },
          },
        },
      },
      payer: true,
      creator: true,
    },
  });

  console.log(`🔄 Found ${dueExpenses.length} recurring expenses to process`);

  const results = [];

  for (const recurring of dueExpenses) {
    try {
      // Check if end date has passed
      if (recurring.endDate && recurring.endDate < now) {
        await prisma.recurringExpense.update({
          where: { id: recurring.id },
          data: { active: false },
        });
        console.log(`⏹️  Deactivated expired recurring expense: ${recurring.title}`);
        results.push({ id: recurring.id, status: 'expired', title: recurring.title });
        continue;
      }

      // Parse split data if available
      let participants;
      if (recurring.splitData) {
        try {
          participants = JSON.parse(recurring.splitData);
        } catch (e) {
          // Fall back to equal split among all members
          participants = recurring.group.members.map((m: any) => ({ 
            userId: m.userId,
          }));
        }
      } else {
        // Default to equal split among all members
        participants = recurring.group.members.map((m: any) => ({ 
          userId: m.userId,
        }));
      }

      // Calculate splits
      const numParticipants = participants.length;
      const amountPerPerson = Number(recurring.amount) / numParticipants;

      // Create expense participants with proper splits
      const expenseParticipants = participants.map((p: any) => {
        const isPayer = p.userId === recurring.payerId;
        return {
          userId: p.userId,
          paidAmount: isPayer ? Number(recurring.amount) : 0,
          owedAmount: amountPerPerson,
          sharePercentage: p.sharePercentage || null,
          shareCount: p.shareCount || null,
        };
      });

      // Create the expense in a transaction
      const expense = await prisma.expense.create({
        data: {
          groupId: recurring.groupId,
          description: recurring.title,
          amount: recurring.amount,
          category: recurring.category || 'recurring',
          createdBy: recurring.createdBy,
          date: now,
          splitType: recurring.splitType,
          participants: {
            create: expenseParticipants,
          },
        },
        include: {
          participants: {
            include: {
              user: true,
            },
          },
        },
      });

      // Update balances
      const { updateBalances } = await import('./balanceService.js');
      await updateBalances(recurring.groupId, [expense.id]);

      // Calculate next run date
      const nextRunDate = calculateNextRunDate(
        recurring.nextRunDate,
        recurring.frequency,
        recurring.interval
      );

      // Update recurring expense
      await prisma.recurringExpense.update({
        where: { id: recurring.id },
        data: { nextRunDate },
      });

      console.log(`✅ Created recurring expense: ${recurring.title} (${recurring.id})`);
      
      // Send email notifications to participants (except payer)
      // DISABLED: Email notifications for recurring expenses
      /*
      try {
        const groupName = recurring.group.name;
        const payerName = recurring.payer.name;
        
        for (const participant of expense.participants) {
          if (participant.userId !== recurring.payerId) {
            const user = participant.user;
            
            // Check if user has notifications enabled
            if (user.emailNotifications && user.expenseNotifications) {
              await sendExpenseNotification(
                user.email,
                user.name,
                {
                  description: expense.description,
                  amount: Number(expense.amount),
                  paidBy: payerName,
                  yourShare: Number(participant.owedAmount),
                  groupName: groupName,
                }
              );
            }
          }
        }
      } catch (emailError) {
        console.error('Failed to send recurring expense notifications:', emailError);
        // Don't fail the whole process if email fails
      }
      */
      
      results.push({ id: recurring.id, status: 'created', title: recurring.title, expenseId: expense.id });
      
    } catch (error) {
      console.error(`❌ Failed to process recurring expense ${recurring.id}:`, error);
      results.push({ id: recurring.id, status: 'error', title: recurring.title, error: String(error) });
    }
  }

  return results;
}

export function getFrequencyDisplay(frequency: string, interval: number): string {
  if (interval === 1) {
    return frequency.charAt(0).toUpperCase() + frequency.slice(1);
  }
  
  const unit = frequency.replace(/ly$/, '');
  return `Every ${interval} ${unit}${interval > 1 ? 's' : ''}`;
}
