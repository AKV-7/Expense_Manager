'use client';

import { useEffect, useState } from 'react';
import { Receipt, Eye, Trash2, Plus, Calendar, DollarSign, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useNotification } from '@/contexts/notification-context';
import api from '@/lib/api';

interface ReceiptData {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  merchantName: string | null;
  totalAmount: number | null;
  date: string | null;
  ocrStatus: 'pending' | 'completed' | 'failed';
  createdAt: string;
  groupId: string | null;
}

interface ReceiptListProps {
  groupId?: string;
  onViewReceipt: (receipt: ReceiptData) => void;
  refreshTrigger?: number;
}

export function ReceiptList({ groupId, onViewReceipt, refreshTrigger }: ReceiptListProps) {
  const [receipts, setReceipts] = useState<ReceiptData[]>([]);
  const [loading, setLoading] = useState(true);
  const { showError, showSuccess } = useNotification();

  const fetchReceipts = async () => {
    try {
      const endpoint = groupId 
        ? `/receipts/group/${groupId}`
        : '/receipts';
      
      const response = await api.get(endpoint);
      
      if (response.data.success) {
        setReceipts(response.data.data);
      }
    } catch (error: any) {
      showError(
        'Failed to load receipts',
        error.response?.data?.error?.message || 'An error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [groupId, refreshTrigger]);

  const handleDelete = async (receiptId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this receipt?')) {
      return;
    }

    try {
      const response = await api.delete(`/receipts/${receiptId}`);
      
      if (response.data.success) {
        showSuccess(
          'Receipt deleted',
          'Receipt has been removed successfully'
        );
        
        // Remove from list
        setReceipts(receipts.filter(r => r.id !== receiptId));
      }
    } catch (error: any) {
      showError(
        'Failed to delete receipt',
        error.response?.data?.error?.message || 'An error occurred'
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Receipt className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4 animate-pulse" />
          <p className="text-sm text-muted-foreground">Loading receipts...</p>
        </div>
      </div>
    );
  }

  if (receipts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Receipt className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
          <p className="text-sm text-muted-foreground mb-2">No receipts uploaded yet</p>
          <p className="text-xs text-muted-foreground">
            Upload your first receipt to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {receipts.map((receipt) => (
        <Card
          key={receipt.id}
          className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => onViewReceipt(receipt)}
        >
          {/* Image preview */}
          <div className="aspect-[3/4] bg-muted relative">
            <img
              src={receipt.thumbnailUrl || receipt.imageUrl}
              alt="Receipt"
              className="w-full h-full object-cover"
            />
            {receipt.ocrStatus === 'pending' && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-white text-sm">Processing...</div>
              </div>
            )}
            {receipt.ocrStatus === 'failed' && (
              <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded">
                OCR Failed
              </div>
            )}
          </div>

          {/* Details */}
          <div className="p-4 space-y-2">
            {/* Merchant name */}
            <div className="flex items-start gap-2">
              <Store className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <p className="font-medium text-sm truncate">
                {receipt.merchantName || 'Unknown Merchant'}
              </p>
            </div>

            {/* Amount */}
            {receipt.totalAmount && (
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-semibold text-green-600">
                  ${receipt.totalAmount.toFixed(2)}
                </p>
              </div>
            )}

            {/* Date */}
            {receipt.date && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">
                  {new Date(receipt.date).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewReceipt(receipt);
                }}
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => handleDelete(receipt.id, e)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
