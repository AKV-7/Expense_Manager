export interface UPIPaymentLink {
  id: number;
  upiLink: string;
  amount: number;
  recipientUpiId: string;
  recipientName: string;
  note: string;
  transactionRef: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'EXPIRED';
  qrCode?: string;
  expenseId?: number;
  groupId?: number;
  userId: number;
  createdAt: string;
  expiresAt: string;
  paidAt?: string;
  upiTransactionId?: string;
}

export interface Balance {
  userId: number;
  userName: string;
  userEmail: string;
  amount: number;
  type: 'owes' | 'owed';
  upiId?: string;
}

export interface PaymentHistory {
  id: number;
  amount: number;
  recipientName: string;
  status: string;
  createdAt: string;
  paidAt?: string;
  note: string;
}

export interface UPIPaymentProps {
  amount: number;
  recipientUpiId: string;
  recipientName: string;
  note: string;
  expenseId?: number;
  groupId?: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}
