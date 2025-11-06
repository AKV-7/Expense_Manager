'use client';

import { useEffect, useState } from 'react';
import { X, Calendar, DollarSign, Store, FileText, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useNotification } from '@/contexts/notification-context';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';

interface ReceiptDetailProps {
  receiptId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ReceiptDetail {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  merchantName: string | null;
  totalAmount: number | null;
  date: string | null;
  ocrText: string | null;
  ocrData: any;
  ocrStatus: 'pending' | 'completed' | 'failed';
  createdAt: string;
  groupId: string | null;
  group?: {
    id: string;
    name: string;
  };
}

export function ReceiptDetailModal({ receiptId, open, onOpenChange }: ReceiptDetailProps) {
  const [receipt, setReceipt] = useState<ReceiptDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [creatingExpense, setCreatingExpense] = useState(false);
  const { showError, showSuccess } = useNotification();
  const router = useRouter();

  useEffect(() => {
    if (receiptId && open) {
      fetchReceiptDetails();
    }
  }, [receiptId, open]);

  const fetchReceiptDetails = async () => {
    if (!receiptId) return;

    setLoading(true);
    try {
      const response = await api.get(`/receipts/${receiptId}`);
      if (response.data.success) {
        setReceipt(response.data.data);
      }
    } catch (error: any) {
      showError(
        'Failed to load receipt',
        error.response?.data?.error?.message || 'An error occurred'
      );
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async () => {
    if (!receipt) return;

    setCreatingExpense(true);
    try {
      const response = await api.post(`/receipts/${receipt.id}/create-expense`);
      
      if (response.data.success) {
        showSuccess(
          'Expense created',
          'Expense has been created from receipt'
        );
        
        onOpenChange(false);
        
        // Redirect to the group page to see the expense
        if (receipt.groupId) {
          router.push(`/groups/${receipt.groupId}`);
        }
      }
    } catch (error: any) {
      showError(
        'Failed to create expense',
        error.response?.data?.error?.message || 'An error occurred'
      );
    } finally {
      setCreatingExpense(false);
    }
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px]">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!receipt) {
    return null;
  }

  // Parse OCR data items
  const ocrItems = receipt.ocrData?.items || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Receipt Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Receipt Image */}
          <div className="rounded-lg overflow-hidden bg-muted">
            <img
              src={receipt.imageUrl}
              alt="Receipt"
              className="w-full h-auto max-h-[400px] object-contain"
            />
          </div>

          {/* OCR Status */}
          {receipt.ocrStatus === 'pending' && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                OCR processing in progress...
              </p>
            </div>
          )}

          {receipt.ocrStatus === 'failed' && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-800 dark:text-red-200">
                OCR processing failed. Please try uploading a clearer image.
              </p>
            </div>
          )}

          {/* Extracted Information */}
          {receipt.ocrStatus === 'completed' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Extracted Information</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Merchant Name */}
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Store className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Merchant</p>
                    <p className="font-medium">
                      {receipt.merchantName || 'Not detected'}
                    </p>
                  </div>
                </div>

                {/* Total Amount */}
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                    <p className="font-medium text-green-600">
                      {receipt.totalAmount 
                        ? `$${receipt.totalAmount.toFixed(2)}`
                        : 'Not detected'}
                    </p>
                  </div>
                </div>

                {/* Date */}
                <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Date</p>
                    <p className="font-medium">
                      {receipt.date 
                        ? new Date(receipt.date).toLocaleDateString()
                        : 'Not detected'}
                    </p>
                  </div>
                </div>

                {/* Group */}
                {receipt.group && (
                  <div className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Group</p>
                      <p className="font-medium">{receipt.group.name}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Line Items */}
              {ocrItems.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Line Items</h4>
                  <div className="border rounded-lg divide-y">
                    {ocrItems.map((item: any, index: number) => (
                      <div key={index} className="p-3 flex justify-between items-center">
                        <div>
                          <p className="font-medium">{item.description || 'Item'}</p>
                          {item.quantity && (
                            <p className="text-xs text-muted-foreground">
                              Qty: {item.quantity}
                            </p>
                          )}
                        </div>
                        <p className="font-medium">
                          ${item.amount?.toFixed(2) || '0.00'}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Full OCR Text */}
              {receipt.ocrText && (
                <div>
                  <h4 className="font-medium mb-2">Full Text (OCR)</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <pre className="text-xs whitespace-pre-wrap font-mono">
                      {receipt.ocrText}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <Button
              onClick={handleCreateExpense}
              disabled={
                creatingExpense || 
                receipt.ocrStatus !== 'completed' || 
                !receipt.groupId
              }
              className="flex-1"
            >
              {creatingExpense ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Expense from Receipt
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>

          {!receipt.groupId && receipt.ocrStatus === 'completed' && (
            <p className="text-xs text-muted-foreground text-center">
              This receipt is not linked to a group. Upload receipts from the group page to create expenses.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
