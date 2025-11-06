import { prisma } from '../utils/prisma.js';

export async function updateBalances(expenseId: string, participants: any[]) {
  console.log('Updating balances for expense:', expenseId);
  console.log('Participants:', JSON.stringify(participants, null, 2));
  
  const creditors = participants.filter(p => p.paidAmount > p.owedAmount);
  const debtors = participants.filter(p => p.paidAmount < p.owedAmount);

  console.log('Creditors (people owed money):', creditors.map(c => ({ userId: c.userId, credit: c.paidAmount - c.owedAmount })));
  console.log('Debtors (people who owe):', debtors.map(d => ({ userId: d.userId, debt: d.owedAmount - d.paidAmount })));

  // Collect all balance operations first
  const balanceOperations = [];

  for (const debtor of debtors) {
    const debt = debtor.owedAmount - debtor.paidAmount;
    
    for (const creditor of creditors) {
      const credit = creditor.paidAmount - creditor.owedAmount;
      const share = (credit / creditors.reduce((sum, c) => sum + (c.paidAmount - c.owedAmount), 0)) * debt;

      if (share > 0.01) {
        balanceOperations.push(
          prisma.balance.upsert({
            where: {
              groupId_userId_owesToUserId: {
                groupId: debtor.groupId,
                userId: debtor.userId,
                owesToUserId: creditor.userId,
              },
            },
            update: { amount: { increment: share } },
            create: {
              groupId: debtor.groupId,
              userId: debtor.userId,
              owesToUserId: creditor.userId,
              amount: share,
            },
          })
        );
      }
    }
  }

  // Execute all balance operations in parallel (much faster than sequential awaits)
  if (balanceOperations.length > 0) {
    await Promise.all(balanceOperations);
  }
}
