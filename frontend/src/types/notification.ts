export type NotificationType = 'success' | 'error' | 'info' | 'warning';

export type NotificationActionType = 
  | 'expense_added'
  | 'expense_updated'
  | 'expense_deleted'
  | 'member_added'
  | 'member_removed'
  | 'payment_received'
  | 'payment_made'
  | 'group_created'
  | 'group_updated'
  | 'profile_updated';

export interface Notification {
  id: string;
  type: NotificationType;
  actionType: NotificationActionType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  userId?: string;
  groupId?: string;
  metadata?: Record<string, any>;
}

export interface ToastNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  duration?: number; // milliseconds, undefined = never auto-dismiss
}
