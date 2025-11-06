'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import { ArrowRight, TrendingDown, TrendingUp, Users, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface SimplifiedTransaction {
  from: { id: string; name: string; email: string };
  to: { id: string; name: string; email: string };
  amount: number;
}

interface UserBalance {
  id: string;
  name: string;
  email: string;
  profileImageUrl: string | null;
  netBalance: number;
  totalOwed: number;
  totalOwes: number;
}

export default function SimplifiedSettlementsPage() {
  const [user, setUser] = useState<any>(null);
  const [groupId, setGroupId] = useState<string>('');
  const [groupName, setGroupName] = useState<string>('');
  const [transactions, setTransactions] = useState<SimplifiedTransaction[]>([]);
  const [userBalances, setUserBalances] = useState<UserBalance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    setMounted(true);
    const userData = getUser();
    if (!userData) {
      router.push('/login');
      return;
    }
    setUser(userData);

    const id = searchParams.get('groupId');
    const name = searchParams.get('groupName');
    
    if (!id) {
      setError('Group ID is required');
      setLoading(false);
      return;
    }

    setGroupId(id);
    setGroupName(name || 'Unknown Group');
    fetchSimplifiedSettlements(id);
  }, [router, searchParams]);

  const fetchSimplifiedSettlements = async (groupId: string) => {
    try {
      setLoading(true);
      setError('');
      
      const { data } = await api.get(`/groups/${groupId}/simplified-settlements`);
      
      setTransactions(data.data.simplifiedTransactions || []);
      setUserBalances(data.data.userBalances || []);
    } catch (err: any) {
      console.error('Failed to fetch simplified settlements:', err);
      setError(err.response?.data?.error?.message || 'Failed to load settlements');
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleRecordPayment = (transaction: SimplifiedTransaction) => {
    router.push(`/settle?groupId=${groupId}&fromId=${transaction.from.id}&toId=${transaction.to.id}&amount=${transaction.amount}`);
  };

  if (!mounted || !user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading optimized settlements...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <button
            onClick={() => router.push(`/groups/${groupId}`)}
            className="text-sm sm:text-base text-muted-foreground hover:text-foreground transition-colors mb-3 flex items-center gap-1"
          >
            ← Back to {groupName}
          </button>
          <div className="flex items-start gap-2 sm:gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                Simplified Settlements
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 sm:mt-2">
                Minimum payments to settle all debts
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg flex items-center gap-2 text-sm sm:text-base">
            <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* All Settled */}
        {transactions.length === 0 && !loading && (
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent pointer-events-none" />
            <CardContent className="relative z-10 py-12 sm:py-16 text-center px-4">
              <CheckCircle2 className="h-12 w-12 sm:h-16 sm:w-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl sm:text-2xl font-bold mb-2">All Settled Up! 🎉</h2>
              <p className="text-sm sm:text-base text-muted-foreground">
                No outstanding debts in this group. Everyone is square!
              </p>
              <Button 
                onClick={() => router.push(`/groups/${groupId}`)}
                className="mt-6"
                size="sm"
              >
                Back to Group
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Simplified Transactions */}
        {transactions.length > 0 && (
          <div className="space-y-4 sm:space-y-6">
            {/* Summary Card */}
            <Card className="relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
              <CardHeader className="relative z-10 pb-3 sm:pb-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                  Optimization Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="relative z-10 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="p-3 sm:p-4 bg-muted rounded-lg">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Transactions</p>
                    <p className="text-2xl sm:text-3xl font-bold text-primary">{transactions.length}</p>
                  </div>
                  <div className="p-3 sm:p-4 bg-muted rounded-lg">
                    <p className="text-xs sm:text-sm text-muted-foreground mb-1">Members</p>
                    <p className="text-2xl sm:text-3xl font-bold text-purple-600">
                      {new Set([...transactions.map(t => t.from.id), ...transactions.map(t => t.to.id)]).size}
                    </p>
                  </div>
                </div>
                <div className="p-3 sm:p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-xs sm:text-sm text-blue-600 dark:text-blue-400">
                    💡 <strong>Smart Optimization:</strong> Minimum payments needed to settle all debts!
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Transactions List */}
            <div className="space-y-3 sm:space-y-4">
              <h2 className="text-base sm:text-xl font-semibold flex items-center gap-2">
                <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                Payment Instructions
              </h2>
              
              {transactions.map((transaction, index) => (
                <Card key={index} className="relative overflow-hidden hover:border-primary/50 transition-all">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />
                  <CardContent className="relative z-10 p-3 sm:p-4 md:p-6">
                    {/* Mobile Layout */}
                    <div className="md:hidden space-y-3">
                      {/* From User */}
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {getInitials(transaction.from.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{transaction.from.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{transaction.from.email}</p>
                        </div>
                      </div>

                      {/* Amount with Arrow */}
                      <div className="flex items-center justify-center gap-2 py-2">
                        <div className="flex-1 h-px bg-border" />
                        <div className="px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg">
                          <p className="text-lg font-bold text-primary">₹{transaction.amount.toFixed(2)}</p>
                        </div>
                        <ArrowRight className="h-5 w-5 text-primary flex-shrink-0" />
                      </div>

                      {/* To User */}
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {getInitials(transaction.to.name)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{transaction.to.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{transaction.to.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Desktop Layout */}
                    <div className="hidden md:flex items-center justify-between gap-4">
                      {/* From User */}
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-white font-bold">
                          {getInitials(transaction.from.name)}
                        </div>
                        <div>
                          <p className="font-semibold">{transaction.from.name}</p>
                          <p className="text-sm text-muted-foreground">{transaction.from.email}</p>
                        </div>
                      </div>

                      {/* Arrow and Amount */}
                      <div className="flex flex-col items-center gap-2 px-4">
                        <ArrowRight className="h-6 w-6 text-primary" />
                        <div className="px-4 py-2 bg-primary/10 border border-primary/20 rounded-lg">
                          <p className="text-xl font-bold text-primary">₹{transaction.amount.toFixed(2)}</p>
                        </div>
                      </div>

                      {/* To User */}
                      <div className="flex items-center gap-3 flex-1 justify-end">
                        <div className="text-right">
                          <p className="font-semibold">{transaction.to.name}</p>
                          <p className="text-sm text-muted-foreground">{transaction.to.email}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-bold">
                          {getInitials(transaction.to.name)}
                        </div>
                      </div>
                    </div>

                    {/* Action Button */}
                    {user.id === transaction.from.id && (
                      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border">
                        <Button 
                          onClick={() => handleRecordPayment(transaction)}
                          className="w-full h-9 sm:h-10"
                          size="sm"
                        >
                          Record Payment
                        </Button>
                      </div>
                    )}

                    {user.id === transaction.to.id && (
                      <div className="mt-3 sm:mt-4 pt-3 sm:pt-4 border-t border-border">
                        <p className="text-xs sm:text-sm text-center text-muted-foreground">
                          ✓ You will receive ₹{transaction.amount.toFixed(2)} from {transaction.from.name}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Member Balances */}
            {userBalances.length > 0 && (
              <Card className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
                <CardHeader className="relative z-10 pb-3 sm:pb-6">
                  <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                    <Users className="h-4 w-4 sm:h-5 sm:w-5" />
                    Member Net Balances
                  </CardTitle>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="space-y-2 sm:space-y-3">
                    {userBalances.map((member) => (
                      <div 
                        key={member.id}
                        className="flex items-center justify-between p-3 sm:p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                      >
                        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-xs sm:text-sm font-bold flex-shrink-0">
                            {getInitials(member.name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm sm:text-base truncate">{member.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                          </div>
                        </div>
                        
                        <div className="text-right flex-shrink-0 ml-2">
                          {member.netBalance > 0.01 ? (
                            <div className="flex items-center gap-1 sm:gap-2">
                              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-green-500" />
                              <span className="font-semibold text-green-500 text-sm sm:text-base">
                                +₹{member.netBalance.toFixed(2)}
                              </span>
                            </div>
                          ) : member.netBalance < -0.01 ? (
                            <div className="flex items-center gap-1 sm:gap-2">
                              <TrendingDown className="h-3 w-3 sm:h-4 sm:w-4 text-red-500" />
                              <span className="font-semibold text-red-500 text-sm sm:text-base">
                                -₹{Math.abs(member.netBalance).toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Settled</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
