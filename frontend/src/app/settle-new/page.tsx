'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser } from '@/lib/auth';
import api, { balanceApi, upiApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Header } from '@/components/header';
import UPIPaymentEnhanced from '@/components/upi-payment-enhanced';
import { BalanceSummary } from '@/components/balance-summary';
import { Balance } from '@/types/upi';

export default function SettlePage() {
  const [user, setUser] = useState<any>(null);
  const [balances, setBalances] = useState<Balance[]>([]);
  const [userUpiId, setUserUpiId] = useState('');
  const [newUpiId, setNewUpiId] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Balance | null>(null);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
    const userData = getUser();
    if (!userData) {
      router.push('/login');
    } else {
      setUser(userData);
      fetchBalances();
      fetchUserProfile();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const fetchBalances = async () => {
    try {
      setLoading(true);
      const response = await balanceApi.getBalances();
      setBalances(response.data || []);
    } catch (error: any) {
      console.error('Error fetching balances:', error);
      setError('Failed to load balances');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await api.get('/user/profile');
      setUserUpiId(response.data.upiId || '');
      setNewUpiId(response.data.upiId || '');
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleUpdateUpiId = async () => {
    if (!upiApi.validateUpiId(newUpiId)) {
      setError('Please enter a valid UPI ID (e.g., username@paytm)');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      await upiApi.updateUpiId(newUpiId);
      setUserUpiId(newUpiId);
      setSuccess('UPI ID updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating UPI ID:', error);
      setError('Failed to update UPI ID');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handlePayNow = (balance: Balance) => {
    if (!balance.upiId) {
      setError('This user has not set up their UPI ID yet.');
      setTimeout(() => setError(''), 3000);
      return;
    }
    setSelectedPayment(balance);
    setShowPaymentDialog(true);
    setError('');
  };

  const handlePaymentSuccess = () => {
    setShowPaymentDialog(false);
    setSelectedPayment(null);
    setSuccess('Payment initiated successfully! Please complete it in your UPI app.');
    setTimeout(() => setSuccess(''), 5000);
    fetchBalances(); // Refresh balances
  };

  const handlePaymentCancel = () => {
    setShowPaymentDialog(false);
    setSelectedPayment(null);
  };

  if (!mounted || !user) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto p-6">
          <div className="flex justify-center items-center h-64">
            <p className="text-gray-500">Loading balances...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto p-6 space-y-6 max-w-6xl">
        <div>
          <h1 className="text-3xl font-bold">Settle Up</h1>
          <p className="text-gray-600 mt-2">Manage your balances and settle payments with UPI</p>
        </div>

        {/* Alerts */}
        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-500/10 border border-green-500/20 text-green-500 rounded-lg">
            {success}
          </div>
        )}

        {/* UPI ID Setup Section */}
        <Card>
          <CardHeader>
            <CardTitle>Your UPI ID</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Set your UPI ID so others can pay you directly via UPI apps (Google Pay, PhonePe, Paytm, etc.)
              </p>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Label htmlFor="upiId">UPI ID</Label>
                  <Input
                    id="upiId"
                    type="text"
                    placeholder="yourname@paytm"
                    value={newUpiId}
                    onChange={(e) => setNewUpiId(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Example: username@paytm, phonenumber@ybl, email@oksbi
                  </p>
                </div>
                <Button 
                  onClick={handleUpdateUpiId}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {userUpiId ? 'Update' : 'Save'} UPI ID
                </Button>
              </div>
              {userUpiId && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Current UPI ID: <strong>{userUpiId}</strong>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Balances Section */}
        <BalanceSummary balances={balances} onPayNow={handlePayNow} />

        {/* Payment Dialog */}
        {showPaymentDialog && selectedPayment && (
          <div 
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={handlePaymentCancel}
          >
            <div 
              className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={handlePaymentCancel}
                className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 flex items-center justify-center transition-colors"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              
              <UPIPaymentEnhanced
                amount={Math.abs(selectedPayment.amount)}
                recipientUPI={selectedPayment.upiId!}
                recipientName={selectedPayment.userName}
                note={`Settlement payment to ${selectedPayment.userName}`}
                onPaymentComplete={handlePaymentSuccess}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
