'use client';

import { useState } from 'react';
import { Receipt, Upload, ArrowLeft, Camera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReceiptUploadDialog } from '@/components/receipt-upload-dialog';
import { ReceiptList } from '@/components/receipt-list';
import { ReceiptDetailModal } from '@/components/receipt-detail-modal';
import { Header } from '@/components/header';
import Link from 'next/link';

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

export default function ReceiptsPage() {
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleViewReceipt = (receipt: ReceiptData) => {
    setSelectedReceiptId(receipt.id);
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="hidden md:block">
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Receipt className="h-8 w-8" />
              My Receipts
            </h1>
            <p className="text-muted-foreground mt-2">
              Upload and manage your expense receipts with automatic OCR processing
            </p>
          </div>

          <div className="flex gap-2">
            {/* Mobile: Show both options */}
            <div className="flex md:hidden gap-2">
              <Button 
                onClick={() => setUploadDialogOpen(true)}
                size="sm"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
              <Button 
                onClick={() => setUploadDialogOpen(true)}
                size="sm"
                variant="outline"
              >
                <Camera className="h-4 w-4 mr-2" />
                Camera
              </Button>
            </div>
            
            {/* Desktop: Single upload button (dialog has both options) */}
            <Button 
              onClick={() => setUploadDialogOpen(true)}
              className="hidden md:flex"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Receipt
            </Button>
          </div>
        </div>
      </div>

      {/* Receipts Grid */}
      <ReceiptList
        onViewReceipt={handleViewReceipt}
        refreshTrigger={refreshTrigger}
      />

      {/* Upload Dialog */}
      <ReceiptUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Detail Modal */}
      <ReceiptDetailModal
        receiptId={selectedReceiptId}
        open={!!selectedReceiptId}
        onOpenChange={(open) => {
          if (!open) setSelectedReceiptId(null);
        }}
      />
      </div>
    </div>
  );
}
