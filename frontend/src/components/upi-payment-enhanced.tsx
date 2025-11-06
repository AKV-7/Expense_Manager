'use client';

import { useState, useEffect } from 'react';
import QRCode from 'react-qr-code';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import api from '@/lib/api';

interface UPIPaymentEnhancedProps {
  recipientUPI: string;
  recipientName: string;
  amount: number;
  note: string;
  paymentId?: string;
  onPaymentComplete?: () => void;
}

export default function UPIPaymentEnhanced({
  recipientUPI,
  recipientName,
  amount,
  note,
  paymentId,
  onPaymentComplete
}: UPIPaymentEnhancedProps) {
  const [upiLink, setUpiLink] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [transactionRef, setTransactionRef] = useState('');
  const [paymentProof, setPaymentProof] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Generate UPI link and QR code
  useEffect(() => {
    generatePaymentDetails();
  }, [recipientUPI, amount, note]);

  const generatePaymentDetails = async () => {
    try {
      const txnId = `TXN_${Date.now()}`;
      setTransactionRef(txnId);

      // Generate UPI deep link
      const params = new URLSearchParams({
        pa: recipientUPI,
        pn: recipientName,
        am: amount.toString(),
        cu: 'INR',
        tn: `${note} - Ref: ${txnId}`,
        tr: txnId
      });

      const link = `upi://pay?${params.toString()}`;
      setUpiLink(link);

      // Generate QR code via backend
      try {
        const response = await api.post('/upi/generate-qr', {
          recipientUPI,
          recipientName,
          amount,
          note: `${note} - Ref: ${txnId}`,
          transactionRef: txnId
        });
        
        if (response.data.qrCode) {
          setQrCode(response.data.qrCode);
        }
      } catch (error) {
        console.error('Error generating QR code from backend:', error);
        // Fallback: use the UPI link for QR
        setQrCode(link);
      }
    } catch (error) {
      console.error('Error generating payment details:', error);
    }
  };

  const handlePayNow = () => {
    // Open UPI app
    window.location.href = upiLink;

    // Show confirmation dialog after 2 seconds
    setTimeout(() => {
      setShowConfirmDialog(true);
    }, 2000);
  };

  const handleMarkAsPaid = async () => {
    if (!transactionRef && !paymentProof) {
      alert('Please enter transaction reference or upload proof');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/upi/confirm-payment', {
        paymentId,
        transactionRef,
        paymentProof,
        amount,
        recipientUPI
      });

      if (response.data.success) {
        alert('Payment confirmed successfully!');
        setShowConfirmDialog(false);
        if (onPaymentComplete) {
          onPaymentComplete();
        }
      }
    } catch (error: any) {
      console.error('Error confirming payment:', error);
      alert(error.response?.data?.error || 'Failed to confirm payment');
    } finally {
      setIsLoading(false);
    }
  };

  const copyUPIId = () => {
    navigator.clipboard.writeText(recipientUPI);
    alert('UPI ID copied to clipboard!');
  };

  const downloadQR = () => {
    const svg = document.getElementById('qr-code-svg');
    if (!svg) return;

    // Convert SVG to canvas and download
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const data = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      
      canvas.toBlob((blob) => {
        if (blob) {
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `upi-payment-${recipientName}-${amount}.png`;
          link.click();
        }
      });
      URL.revokeObjectURL(url);
    };
    img.src = url;
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Pay via UPI</CardTitle>
        <CardDescription>
          Pay ₹{amount.toFixed(2)} to {recipientName}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* UPI ID Display */}
        <div className="space-y-2">
          <Label>Recipient UPI ID</Label>
          <div className="flex gap-2">
            <Input value={recipientUPI} readOnly className="flex-1" />
            <Button variant="outline" size="sm" onClick={copyUPIId}>
              Copy
            </Button>
          </div>
        </div>

        {/* Amount Display */}
        <div className="space-y-2">
          <Label>Amount</Label>
          <Input value={`₹ ${amount.toFixed(2)}`} readOnly />
        </div>

        {/* Note Display */}
        <div className="space-y-2">
          <Label>Payment Note</Label>
          <Input value={note} readOnly />
        </div>

        {/* Transaction Reference */}
        <div className="space-y-2">
          <Label>Transaction Reference</Label>
          <Input value={transactionRef} readOnly className="text-xs" />
        </div>

        {/* QR Code Section */}
        {showQR && (
          <div className="flex flex-col items-center space-y-4 p-4 bg-white rounded-lg">
            <div id="qr-code-svg" className="bg-white p-4">
              <QRCode
                value={qrCode || upiLink}
                size={200}
                level="H"
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
            <p className="text-sm text-gray-600 text-center">
              Scan with any UPI app to pay
            </p>
            <Button variant="outline" size="sm" onClick={downloadQR}>
              Download QR Code
            </Button>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex flex-col gap-2">
        <div className="flex gap-2 w-full">
          <Button onClick={handlePayNow} className="flex-1">
            Pay Now via UPI
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowQR(!showQR)}
            className="flex-1"
          >
            {showQR ? 'Hide QR' : 'Show QR Code'}
          </Button>
        </div>
        
        <p className="text-xs text-gray-500 text-center mt-2">
          Click "Pay Now" to open your UPI app with pre-filled details
        </p>
      </CardFooter>

      {/* Payment Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Payment</DialogTitle>
            <DialogDescription>
              Did you complete the payment of ₹{amount.toFixed(2)} to {recipientName}?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="txn-ref">
                UPI Transaction Reference (Optional)
              </Label>
              <Input
                id="txn-ref"
                placeholder="e.g., 123456789012"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
              />
              <p className="text-xs text-gray-500">
                Found in your payment confirmation SMS
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="proof">
                Payment Proof (Optional)
              </Label>
              <Textarea
                id="proof"
                placeholder="Paste screenshot URL or additional notes"
                value={paymentProof}
                onChange={(e) => setPaymentProof(e.target.value)}
                rows={3}
              />
            </div>

            <div className="bg-blue-50 p-3 rounded-md text-sm">
              <p className="font-semibold mb-1">Transaction Details:</p>
              <p className="text-xs">Reference: {transactionRef}</p>
              <p className="text-xs">Amount: ₹{amount.toFixed(2)}</p>
              <p className="text-xs">To: {recipientName} ({recipientUPI})</p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleMarkAsPaid} disabled={isLoading}>
              {isLoading ? 'Confirming...' : 'Yes, I Paid'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
