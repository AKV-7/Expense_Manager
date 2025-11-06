export function calculateSplits(
  amount: number,
  splitType: string,
  participants: any[]
): { userId: string; owedAmount: number }[] {
  switch (splitType) {
    case 'equal':
      const equalShare = amount / participants.length;
      return participants.map(p => ({ userId: p.userId, owedAmount: equalShare }));

    case 'percentage':
      return participants.map(p => ({
        userId: p.userId,
        owedAmount: (amount * p.sharePercentage) / 100,
      }));

    case 'exact':
      return participants.map(p => ({ userId: p.userId, owedAmount: p.owedAmount }));

    case 'shares':
      const totalShares = participants.reduce((sum, p) => sum + p.shareCount, 0);
      const perShare = amount / totalShares;
      return participants.map(p => ({
        userId: p.userId,
        owedAmount: perShare * p.shareCount,
      }));

    default:
      throw new Error('Invalid split type');
  }
}
