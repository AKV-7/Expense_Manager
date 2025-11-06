import { prisma } from '../utils/prisma.js';

/**
 * Recalculate all balances for a group from scratch
 * This clears existing balances and recalculates from all expenses
 */
export async function recalculateGroupBalances(groupId: string) {
  console.log(`\n=== Recalculating balances for group: ${groupId} ===`);
  
  // Step 1: Delete all existing balances for this group
  await prisma.balance.deleteMany({
    where: { groupId }
  });
  console.log('✓ Cleared existing balances');

  // Step 2: Get all expenses with participants
  const expenses = await prisma.expense.findMany({
    where: { groupId },
    include: {
      participants: {
        include: {
          user: { select: { id: true, name: true } }
        }
      }
    }
  });

  console.log(`✓ Found ${expenses.length} expenses to process`);

  // Step 3: Calculate balances for each expense
  for (const expense of expenses) {
    const participants = expense.participants.map(p => ({
      userId: p.userId,
      paidAmount: Number(p.paidAmount),
      owedAmount: Number(p.owedAmount),
      groupId: expense.groupId
    }));

    console.log(`\nProcessing expense: ${expense.description} (₹${expense.amount})`);
    console.log('Participants:', participants.map(p => `${p.userId}: paid ${p.paidAmount}, owes ${p.owedAmount}`));

    // Find who paid and who owes
    const creditors = participants.filter(p => p.paidAmount > p.owedAmount);
    const debtors = participants.filter(p => p.paidAmount < p.owedAmount);

    console.log(`Creditors: ${creditors.length}, Debtors: ${debtors.length}`);

    // Create balance entries
    for (const debtor of debtors) {
      const debt = debtor.owedAmount - debtor.paidAmount;
      
      for (const creditor of creditors) {
        const credit = creditor.paidAmount - creditor.owedAmount;
        const totalCredit = creditors.reduce((sum, c) => sum + (c.paidAmount - c.owedAmount), 0);
        const share = (credit / totalCredit) * debt;

        if (share > 0.01) {
          console.log(`  → ${debtor.userId} owes ${creditor.userId}: ₹${share.toFixed(2)}`);
          
          await prisma.balance.upsert({
            where: {
              groupId_userId_owesToUserId: {
                groupId,
                userId: debtor.userId,
                owesToUserId: creditor.userId,
              },
            },
            update: { amount: { increment: share } },
            create: {
              groupId,
              userId: debtor.userId,
              owesToUserId: creditor.userId,
              amount: share,
            },
          });
        }
      }
    }
  }

  // Step 4: Get final balances
  const finalBalances = await prisma.balance.findMany({
    where: { groupId },
    include: {
      user: { select: { name: true } },
      owesToUser: { select: { name: true } }
    }
  });

  console.log('\n=== Final Balances ===');
  for (const balance of finalBalances) {
    console.log(`${balance.user.name} owes ${balance.owesToUser.name}: ₹${Number(balance.amount).toFixed(2)}`);
  }
  console.log('======================\n');

  return finalBalances;
}
