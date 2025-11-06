'use client';

import { Balance } from '@/types/upi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface BalanceCardProps {
  balance: Balance;
  onPayNow: (balance: Balance) => void;
}

export function BalanceCard({ balance, onPayNow }: BalanceCardProps) {
  const isOwe = balance.type === 'owes';
  
  return (
    <Card className={`border-l-4 ${isOwe ? 'border-l-red-500' : 'border-l-green-500'}`}>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span className="text-lg">{balance.userName}</span>
          <span className={`text-xl font-bold ${isOwe ? 'text-red-600' : 'text-green-600'}`}>
            ₹{Math.abs(balance.amount).toFixed(2)}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-600">
            {isOwe ? (
              <span>You owe {balance.userName}</span>
            ) : (
              <span>{balance.userName} owes you</span>
            )}
            {balance.upiId && (
              <div className="text-xs text-gray-500 mt-1">
                UPI: {balance.upiId}
              </div>
            )}
          </div>
          
          {isOwe && balance.upiId && (
            <button
              onClick={() => onPayNow(balance)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Pay Now
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface BalanceSummaryProps {
  balances: Balance[];
  onPayNow: (balance: Balance) => void;
}

export function BalanceSummary({ balances, onPayNow }: BalanceSummaryProps) {
  const totalOwed = balances
    .filter(b => b.type === 'owed')
    .reduce((sum, b) => sum + b.amount, 0);
    
  const totalOwes = balances
    .filter(b => b.type === 'owes')
    .reduce((sum, b) => sum + Math.abs(b.amount), 0);
    
  const netBalance = totalOwed - totalOwes;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-green-50">
          <CardHeader>
            <CardTitle className="text-sm text-green-700">You Are Owed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">₹{totalOwed.toFixed(2)}</p>
          </CardContent>
        </Card>
        
        <Card className="bg-red-50">
          <CardHeader>
            <CardTitle className="text-sm text-red-700">You Owe</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600">₹{totalOwes.toFixed(2)}</p>
          </CardContent>
        </Card>
        
        <Card className={netBalance >= 0 ? 'bg-blue-50' : 'bg-orange-50'}>
          <CardHeader>
            <CardTitle className="text-sm text-gray-700">Net Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
              {netBalance >= 0 ? '+' : '-'}₹{Math.abs(netBalance).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        <h3 className="text-lg font-semibold">Individual Balances</h3>
        {balances.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              No outstanding balances. You're all settled up! 🎉
            </CardContent>
          </Card>
        ) : (
          balances.map((balance) => (
            <BalanceCard key={balance.userId} balance={balance} onPayNow={onPayNow} />
          ))
        )}
      </div>
    </div>
  );
}
