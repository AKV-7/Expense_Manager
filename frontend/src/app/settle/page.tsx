'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import UPIPaymentEnhanced from '@/components/upi-payment-enhanced';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useNotification } from '@/contexts/notification-context';
import { triggerGlobalRefresh } from '@/lib/refresh';

interface Balance {
  userId: string;
  userName: string;
  userEmail: string;
  userUpiId?: string;
  amount: number;
}

export default function SettlePage() {
  const { showSuccess, showError, showWarning } = useNotification();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<any>(null);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [groupName, setGroupName] = useState('');
  const [balances, setBalances] = useState<Balance[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<Balance | null>(null);
  const [showUPIPayment, setShowUPIPayment] = useState(false);
  const [manualPayment, setManualPayment] = useState({
    toUserId: '',
    amount: '',
    paymentMethod: 'upi',
    notes: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Refresh data when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && selectedGroup) {
        fetchBalances(selectedGroup);
      }
    };

    const handleFocus = () => {
      if (selectedGroup) {
        fetchBalances(selectedGroup);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [selectedGroup]);

  useEffect(() => {
    setMounted(true);
    const userData = getUser();
    if (!userData) {
      router.push('/login');
    } else {
      setUser(userData);
      fetchGroups();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const fetchGroups = async () => {
    try {
      const res = await api.get('/groups');
      const fetchedGroups = res.data.data.groups || [];
      setGroups(fetchedGroups);
      
      // Auto-select group from URL params
      const groupIdFromUrl = searchParams.get('groupId');
      const groupNameFromUrl = searchParams.get('groupName');
      
      if (groupIdFromUrl) {
        setSelectedGroup(groupIdFromUrl);
        setGroupName(groupNameFromUrl || '');
        fetchBalances(groupIdFromUrl);
      }
    } catch (err) {
      console.error('Failed to fetch groups:', err);
      setGroups([]);
    }
  };

  const fetchBalances = async (groupId: string) => {
    try {
      const currentUser = user || getUser();
      if (!currentUser) {
        setError('User not authenticated');
        return;
      }

      const res = await api.get(`/groups/${groupId}`);
      const balanceData = res.data.data.balances || [];
      
      // Filter to show only people you owe (where current user is the debtor)
      const owedBalances = balanceData
        .filter((b: any) => b.userId === currentUser.id && Number(b.amount) > 0)
        .map((b: any) => ({
          userId: b.owesToUserId,
          userName: b.owesToUser?.name || 'Unknown',
          userEmail: b.owesToUser?.email || '',
          userUpiId: b.owesToUser?.upiId || '',
          amount: Number(b.amount)
        }));
      
      setBalances(owedBalances);
      
      if (owedBalances.length === 0) {
        setSuccess('All settled up! No pending payments.');
      }
    } catch (err: any) {
      console.error('Failed to fetch balances:', err);
      setError(err.response?.data?.error?.message || 'Failed to fetch balances');
      setBalances([]);
    }
  };

  const handleGroupChange = (groupId: string) => {
    setSelectedGroup(groupId);
    setBalances([]);
    setSelectedPayment(null);
    setShowUPIPayment(false);
    if (groupId) fetchBalances(groupId);
  };

  const handlePayViaUPI = (balance: Balance) => {
    if (!balance.userUpiId) {
      setError('This user has not set up their UPI ID');
      return;
    }
    setSelectedPayment(balance);
    setShowUPIPayment(true);
    setError('');
  };

  const handleManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await api.post('/payments', {
        groupId: selectedGroup,
        toUserId: manualPayment.toUserId,
        amount: parseFloat(manualPayment.amount),
        paymentMethod: manualPayment.paymentMethod,
        notes: manualPayment.notes,
      });
      
      const recipientName = balances.find(b => b.userId === manualPayment.toUserId)?.userName || 'user';
      showSuccess(
        'Payment Recorded',
        `Successfully recorded payment of ₹${manualPayment.amount} to ${recipientName}`
      );
      
      // Trigger global refresh
      triggerGlobalRefresh();
      
      // Redirect back to group page
      setTimeout(() => {
        router.push(`/groups/${selectedGroup}`);
      }, 500);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to record payment';
      setError(errorMsg);
      showError('Payment Failed', errorMsg);
    }
  };

  const handlePaymentComplete = () => {
    setShowUPIPayment(false);
    setSelectedPayment(null);
    const recipientName = selectedPayment?.userName || 'user';
    showSuccess(
      'Payment Confirmed',
      `Payment to ${recipientName} completed successfully`
    );
    
    // Trigger global refresh
    triggerGlobalRefresh();
    
    // Redirect back to group page
    setTimeout(() => {
      router.push(`/groups/${selectedGroup}`);
    }, 500);
  };

  if (!mounted || !user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-2xl mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>
              {groupName ? `Settle Payments - ${groupName}` : 'Record Payment'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {error && <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded">{error}</div>}
            {success && <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 text-green-500 rounded">{success}</div>}

            <form onSubmit={handleManualPayment} className="space-y-4">
              {!groupName ? (
                <div>
                  <label className="block text-sm font-medium mb-2">Group</label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => handleGroupChange(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    required
                  >
                    <option value="">Select a group</option>
                    {Array.isArray(groups) && groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
                  <p className="text-sm text-muted-foreground">Group</p>
                  <p className="font-semibold">{groupName}</p>
                </div>
              )}

              {selectedGroup && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-2">Pay to</label>
                    <select
                      value={manualPayment.toUserId}
                      onChange={(e) => setManualPayment({...manualPayment, toUserId: e.target.value})}
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    >
                      <option value="">Select a member</option>
                      {balances.map((b) => (
                        <option key={b.userId} value={b.userId}>{b.userName}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Amount (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={manualPayment.amount}
                      onChange={(e) => setManualPayment({...manualPayment, amount: e.target.value})}
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Payment Method</label>
                    <select
                      value={manualPayment.paymentMethod}
                      onChange={(e) => setManualPayment({...manualPayment, paymentMethod: e.target.value})}
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="cash">Cash</option>
                      <option value="upi">UPI</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="card">Card</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Notes (optional)</label>
                    <textarea
                      value={manualPayment.notes}
                      onChange={(e) => setManualPayment({...manualPayment, notes: e.target.value})}
                      className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                      rows={3}
                    />
                  </div>

                  <Button type="submit" className="w-full">Record Payment</Button>
                </>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Balances Section */}
        {selectedGroup && balances.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Your Outstanding Balances</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {balances.map((balance) => (
                <div key={balance.userId} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{balance.userName}</p>
                    <p className="text-sm text-muted-foreground">{balance.userEmail}</p>
                    {balance.userUpiId && (
                      <p className="text-xs text-muted-foreground mt-1">UPI: {balance.userUpiId}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-lg font-bold text-red-500">₹{balance.amount.toFixed(2)}</p>
                    {balance.userUpiId ? (
                      <Button 
                        onClick={() => handlePayViaUPI(balance)}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Pay via UPI
                      </Button>
                    ) : (
                      <Button variant="outline" disabled>
                        No UPI ID
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* UPI Payment Modal */}
        {showUPIPayment && selectedPayment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Pay {selectedPayment.userName}</CardTitle>
                <button
                  onClick={() => {
                    setShowUPIPayment(false);
                    setSelectedPayment(null);
                  }}
                  className="absolute right-4 top-4 text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </CardHeader>
              <CardContent>
                <UPIPaymentEnhanced
                  recipientUPI={selectedPayment.userUpiId || ''}
                  amount={selectedPayment.amount}
                  recipientName={selectedPayment.userName}
                  note={`Payment to ${selectedPayment.userName}`}
                  onPaymentComplete={handlePaymentComplete}
                />
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
