export interface RecurringExpense {
  id: string;
  groupId: string;
  createdBy: string;
  title: string;
  amount: number;
  category?: string;
  payerId: string;
  splitType: 'equal' | 'percentage' | 'shares';
  splitData?: any;
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
  interval: number;
  startDate: string;
  endDate?: string;
  nextRunDate: string;
  active: boolean;
  timezone: string;
  createdAt: string;
  updatedAt: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  payer?: {
    id: string;
    name: string;
    email: string;
  };
  group?: {
    id: string;
    name: string;
  };
}

export type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'yearly';
export type SplitType = 'equal' | 'percentage' | 'shares';
