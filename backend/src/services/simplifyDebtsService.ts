import { prisma } from '../utils/prisma.js';

/**
 * Simplify Debts Algorithm
 * 
 * Problem: Given a list of debts between users, minimize the number of transactions
 * needed to settle all debts.
 * 
 * Algorithm: Cash Flow Minimization
 * 1. Calculate net balance for each user (total owed to - total owed by)
 * 2. Separate users into creditors (positive balance) and debtors (negative balance)
 * 3. Match debtors with creditors to minimize transactions
 * 
 * Example:
 * A owes B: 100, B owes C: 100
 * Without simplification: 2 transactions (A→B: 100, B→C: 100)
 * With simplification: 1 transaction (A→C: 100)
 */

interface Balance {
  id: string;
  userId: string;  // who owes
  owesToUserId: string;  // who is owed
  amount: number;
  user: { id: string; name: string; email: string };  // debtor
  owesToUser: { id: string; name: string; email: string };  // creditor
}

interface NetBalance {
  userId: string;
  name: string;
  email: string;
  amount: number; // Positive = owed to them, Negative = they owe
}

interface SimplifiedTransaction {
  from: { id: string; name: string; email: string };
  to: { id: string; name: string; email: string };
  amount: number;
}

/**
 * Get simplified debts for a group
 */
export async function getSimplifiedDebts(groupId: string): Promise<SimplifiedTransaction[]> {
  // Fetch all balances for the group
  const rawBalances = await prisma.balance.findMany({
    where: { groupId, amount: { gt: 0 } },
    include: {
      user: { select: { id: true, name: true, email: true } },  // debtor
      owesToUser: { select: { id: true, name: true, email: true } }  // creditor
    }
  });

  if (rawBalances.length === 0) {
    return [];
  }

  // Convert Decimal to number
  const balances: Balance[] = rawBalances.map(b => ({
    id: b.id,
    userId: b.userId,
    owesToUserId: b.owesToUserId,
    amount: Number(b.amount),
    user: b.user,
    owesToUser: b.owesToUser
  }));

  // Calculate net balance for each user
  const netBalances = calculateNetBalances(balances);

  // Separate creditors and debtors
  const creditors = netBalances.filter(nb => nb.amount > 0.01); // owed to them
  const debtors = netBalances.filter(nb => nb.amount < -0.01); // they owe

  // Generate simplified transactions
  return minimizeTransactions(creditors, debtors);
}

/**
 * Calculate net balance for each user
 */
function calculateNetBalances(balances: Balance[]): NetBalance[] {
  const userBalanceMap = new Map<string, NetBalance>();

  balances.forEach(balance => {
    // User who owes (userId) - negative balance
    if (!userBalanceMap.has(balance.userId)) {
      userBalanceMap.set(balance.userId, {
        userId: balance.userId,
        name: balance.user.name,
        email: balance.user.email,
        amount: 0
      });
    }
    const debtorBalance = userBalanceMap.get(balance.userId)!;
    debtorBalance.amount -= balance.amount;

    // User who is owed (owesToUserId) - positive balance
    if (!userBalanceMap.has(balance.owesToUserId)) {
      userBalanceMap.set(balance.owesToUserId, {
        userId: balance.owesToUserId,
        name: balance.owesToUser.name,
        email: balance.owesToUser.email,
        amount: 0
      });
    }
    const creditorBalance = userBalanceMap.get(balance.owesToUserId)!;
    creditorBalance.amount += balance.amount;
  });

  return Array.from(userBalanceMap.values());
}

/**
 * Minimize transactions using greedy algorithm
 * Match largest debtor with largest creditor
 */
function minimizeTransactions(
  creditors: NetBalance[], 
  debtors: NetBalance[]
): SimplifiedTransaction[] {
  const transactions: SimplifiedTransaction[] = [];
  
  // Sort creditors (descending) and debtors (ascending, so most negative first)
  creditors.sort((a, b) => b.amount - a.amount);
  debtors.sort((a, b) => a.amount - b.amount);

  let i = 0; // creditor index
  let j = 0; // debtor index

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];

    // Amount to transfer is minimum of what creditor is owed and what debtor owes
    const transferAmount = Math.min(creditor.amount, Math.abs(debtor.amount));

    if (transferAmount > 0.01) { // Skip negligible amounts
      transactions.push({
        from: { id: debtor.userId, name: debtor.name, email: debtor.email },
        to: { id: creditor.userId, name: creditor.name, email: creditor.email },
        amount: parseFloat(transferAmount.toFixed(2))
      });
    }

    // Update balances
    creditor.amount -= transferAmount;
    debtor.amount += transferAmount;

    // Move to next creditor or debtor
    if (creditor.amount < 0.01) i++;
    if (Math.abs(debtor.amount) < 0.01) j++;
  }

  return transactions;
}

/**
 * Get all users involved in a group with their balances
 */
export async function getGroupUsersWithBalances(groupId: string) {
  const members = await prisma.member.findMany({
    where: { groupId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          profileImageUrl: true
        }
      }
    }
  });

  const balances = await prisma.balance.findMany({
    where: { groupId, amount: { gt: 0 } }
  });

  // Calculate each user's net balance
  const userBalances = members.map(member => {
    const owed = balances
      .filter(b => b.owesToUserId === member.userId)  // amounts owed TO this user
      .reduce((sum, b) => sum + Number(b.amount), 0);
    
    const owes = balances
      .filter(b => b.userId === member.userId)  // amounts this user owes
      .reduce((sum, b) => sum + Number(b.amount), 0);

    return {
      ...member.user,
      netBalance: owed - owes,
      totalOwed: owed,
      totalOwes: owes
    };
  });

  return userBalances;
}
