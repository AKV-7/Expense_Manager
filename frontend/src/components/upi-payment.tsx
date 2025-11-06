'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';

interface UPIPaymentProps {
  toUserId: string;
  toUserName: string;
  amount: number;
  groupId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface PaymentData {
  upiLink: string;
  qrData: string;
  paymentId: string;
  transactionRef: string;
  recipientName: string;
  recipientUPI: string;
  amount: number;
  formattedAmount: string;
  note: string;
  expiresAt: string;
}

export function UPIPayment({ 
  toUserId, 
  toUserName, 
  amount, 
  groupId, 
  onSuccess, 
  onCancel 
}: UPIPaymentProps) {
  const [step, setStep] = useState<'init' | 'payment' | 'confirm' | 'success'>('init');
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [qrCodeImage, setQrCodeImage] = useState<string>('');
  const [upiRefNumber, setUpiRefNumber] = useState('');
  const [smsText, setSmsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes in seconds

  // Generate QR code using qrcode library
  useEffect(() => {
    if (paymentData?.qrData) {
      // Dynamically import QRCode to avoid SSR issues
      import('qrcode').then((QRCode) => {
        QRCode.toDataURL(paymentData.qrData, {
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#FFFFFF',
          },
        }).then(setQrCodeImage).catch(console.error);
      });
    }
  }, [paymentData?.qrData]);

  // Timer countdown
  useEffect(() => {
    if (step === 'payment' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [step, timeLeft]);

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate payment link
  const generatePayment = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/upi/generate-link', {
        toUserId,
        amount,
        groupId,
        note: `Payment to ${toUserName}`,
      });

      setPaymentData(res.data.data);
      setStep('payment');
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to generate payment link');
    } finally {
      setLoading(false);
    }
  };

  // Handle UPI app payment
  const handlePayNow = () => {
    if (!paymentData) return;

    // Try to open UPI link
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // On mobile, directly open UPI link
      window.location.href = paymentData.upiLink;
    } else {
      // On desktop, show QR code
      setShowQR(true);
    }

    // Move to confirmation step after 2 seconds
    setTimeout(() => {
      setStep('confirm');
    }, 2000);
  };

  // Confirm payment manually
  const handleConfirmPayment = async () => {
    setLoading(true);
    setError('');

    try {
      await api.post('/upi/confirm', {
        paymentId: paymentData?.paymentId,
        upiRefNumber: upiRefNumber || undefined,
      });

      setStep('success');
      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to confirm payment');
    } finally {
      setLoading(false);
    }
  };

  // Verify payment via SMS
  const handleVerifyViaSMS = async () => {
    setLoading(true);
    setError('');

    try {
      await api.post('/upi/verify-sms', {
        paymentId: paymentData?.paymentId,
        smsText,
      });

      setStep('success');
      setTimeout(() => {
        onSuccess?.();
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to verify payment via SMS');
    } finally {
      setLoading(false);
    }
  };

  // Cancel payment
  const handleCancel = async () => {
    if (paymentData?.paymentId) {
      try {
        await api.delete(`/upi/payment/${paymentData.paymentId}`);
      } catch (err) {
        console.error('Failed to cancel payment:', err);
      }
    }
    onCancel?.();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>
          {step === 'init' && 'UPI Payment'}
          {step === 'payment' && 'Pay via UPI'}
          {step === 'confirm' && 'Confirm Payment'}
          {step === 'success' && 'Payment Successful'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded">
            {error}
          </div>
        )}

        {/* Initial Step */}
        {step === 'init' && (
          <div className="space-y-4">
            <div className="text-center py-6">
              <p className="text-sm text-muted-foreground mb-2">You are paying</p>
              <p className="text-3xl font-bold">₹{amount.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground mt-2">to {toUserName}</p>
            </div>

            <div className="flex gap-2">
              <Button onClick={generatePayment} disabled={loading} className="flex-1">
                {loading ? 'Generating...' : 'Pay Now'}
              </Button>
              <Button onClick={handleCancel} variant="outline">
                Cancel
              </Button>
            </div>

            <div className="text-xs text-muted-foreground text-center space-y-1">
              <p>💳 Works with all UPI apps</p>
              <p>🔒 Secure & Direct P2P transfer</p>
              <p>⚡ Instant settlement</p>
            </div>
          </div>
        )}

        {/* Payment Step */}
        {step === 'payment' && paymentData && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-2xl font-bold mb-1">{paymentData.formattedAmount}</p>
              <p className="text-sm text-muted-foreground">to {paymentData.recipientName}</p>
              <p className="text-xs text-muted-foreground mt-1">{paymentData.recipientUPI}</p>
            </div>

            {!showQR ? (
              <div className="space-y-3">
                <Button onClick={handlePayNow} className="w-full" size="lg">
                  Open UPI App
                </Button>
                <Button onClick={() => setShowQR(true)} variant="outline" className="w-full">
                  Show QR Code
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {qrCodeImage && (
                  <div className="flex justify-center p-4 bg-white rounded">
                    <img src={qrCodeImage} alt="UPI QR Code" className="w-64 h-64" />
                  </div>
                )}
                <p className="text-xs text-center text-muted-foreground">
                  Scan with any UPI app to pay
                </p>
                <Button onClick={() => setShowQR(false)} variant="outline" className="w-full">
                  Use UPI Link Instead
                </Button>
              </div>
            )}

            <div className="text-center text-xs text-muted-foreground">
              <p>⏱️ Expires in {formatTime(timeLeft)}</p>
              <p className="mt-1">Reference: {paymentData.transactionRef}</p>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => setStep('confirm')} variant="outline" className="flex-1">
                I've Paid
              </Button>
              <Button onClick={handleCancel} variant="ghost">
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Confirmation Step */}
        {step === 'confirm' && paymentData && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <div className="text-4xl mb-2">✅</div>
              <p className="font-medium">Complete your payment</p>
              <p className="text-sm text-muted-foreground mt-1">
                Enter UPI PIN in your app and confirm
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="upiRef" className="text-sm">
                  UPI Reference Number (Optional)
                </Label>
                <Input
                  id="upiRef"
                  placeholder="e.g., 123456789012"
                  value={upiRefNumber}
                  onChange={(e) => setUpiRefNumber(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  You'll find this in your payment confirmation SMS
                </p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Or verify via SMS
                  </span>
                </div>
              </div>

              <div>
                <Label htmlFor="sms" className="text-sm">
                  Paste Payment SMS (Optional)
                </Label>
                <textarea
                  id="sms"
                  placeholder="Paste your payment confirmation SMS here..."
                  value={smsText}
                  onChange={(e) => setSmsText(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mt-1"
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                {smsText ? (
                  <Button onClick={handleVerifyViaSMS} disabled={loading} className="flex-1">
                    {loading ? 'Verifying...' : 'Verify via SMS'}
                  </Button>
                ) : (
                  <Button onClick={handleConfirmPayment} disabled={loading} className="flex-1">
                    {loading ? 'Confirming...' : 'Confirm Payment'}
                  </Button>
                )}
                <Button onClick={() => setStep('payment')} variant="outline">
                  Back
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Success Step */}
        {step === 'success' && (
          <div className="text-center py-8 space-y-4">
            <div className="text-6xl animate-bounce">🎉</div>
            <div>
              <p className="text-xl font-bold">Payment Confirmed!</p>
              <p className="text-sm text-muted-foreground mt-2">
                Your payment of ₹{amount.toFixed(2)} to {toUserName} has been recorded
              </p>
            </div>
            <Button onClick={onSuccess} className="w-full">
              Done
            </Button>
          </div>
        )}

        {/* Payment Instructions */}
        {step === 'payment' && (
          <div className="mt-4 p-3 bg-muted/50 rounded text-xs space-y-1">
            <p className="font-medium">How to pay:</p>
            <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
              <li>Click "Open UPI App" or scan QR code</li>
              <li>Select your preferred UPI app</li>
              <li>Enter your UPI PIN</li>
              <li>Complete the payment</li>
              <li>Click "I've Paid" button</li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
