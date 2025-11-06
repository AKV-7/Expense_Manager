import { prisma } from '../utils/prisma.js';

/**
 * Fix existing expense participants that have incorrect paidAmount (0 when they actually paid)
 * This fixes historical data from before the paidAmount bug was fixed
 */
export async function fixExpenseParticipants(groupId?: string) {
  console.log('\n=== Fixing Expense Participants ===');
  
  // Get all expenses (optionally filtered by group)
  const expenses = await prisma.expense.findMany({
    where: groupId ? { groupId } : undefined,
    include: {
      participants: true
    }
  });

  console.log(`Found ${expenses.length} expenses to check`);

  let fixed = 0;

  for (const expense of expenses) {
    // Find who should have paid (the one with userId === expense.createdBy)
    const payer = expense.participants.find(p => p.userId === expense.createdBy);
    
    if (payer && Number(payer.paidAmount) === 0) {
      // This is wrong! The payer should have paidAmount = expense.amount
      console.log(`\nFixing expense: ${expense.description} (₹${expense.amount})`);
      console.log(`  Payer ${payer.userId} had paidAmount=0, setting to ${expense.amount}`);
      
      await prisma.expenseParticipant.update({
        where: { id: payer.id },
        data: { paidAmount: expense.amount }
      });
      
      fixed++;
    }
  }

  console.log(`\n✅ Fixed ${fixed} expense participants`);
  console.log('===================================\n');
  
  return { fixed, total: expenses.length };
}
