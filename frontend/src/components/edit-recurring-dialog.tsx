'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotification } from '@/contexts/notification-context';
import api from '@/lib/api';
import { Edit } from 'lucide-react';
import type { FrequencyType, RecurringExpense } from '@/types/recurring';

interface EditRecurringDialogProps {
  recurringId: string;
  members: Array<{ id: string; user: { id: string; name: string; email: string } }>;
  open: boolean;
  onClose: () => void;
  onRecurringUpdated: () => void;
}

const CATEGORIES = [
  'rent',
  'utilities',
  'groceries',
  'entertainment',
  'transportation',
  'subscriptions',
  'insurance',
  'other',
];

const FREQUENCIES: { value: FrequencyType; label: string }[] = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly' },
];

export function EditRecurringDialog({ recurringId, members, open, onClose, onRecurringUpdated }: EditRecurringDialogProps) {
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const { showSuccess, showError } = useNotification();

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'other',
    payerId: '',
    frequency: 'monthly' as FrequencyType,
    interval: '1',
    startDate: '',
    endDate: '',
    splitType: 'equal',
    active: true,
  });

  useEffect(() => {
    if (open && recurringId) {
      fetchRecurringDetails();
    }
  }, [open, recurringId]);

  const fetchRecurringDetails = async () => {
    setFetchLoading(true);
    try {
      // We need to get the recurring expense details
      // Since we don't have a single endpoint, we'll need to pass the data from parent
      // For now, let's make a simple approach
      const { data } = await api.get(`/recurring/${recurringId}`);
      const expense: RecurringExpense = data.data;
      
      setFormData({
        title: expense.title,
        amount: expense.amount.toString(),
        category: expense.category || 'other',
        payerId: expense.payerId,
        frequency: expense.frequency,
        interval: expense.interval.toString(),
        startDate: new Date(expense.startDate).toISOString().split('T')[0],
        endDate: expense.endDate ? new Date(expense.endDate).toISOString().split('T')[0] : '',
        splitType: expense.splitType,
        active: expense.active,
      });
    } catch (err: any) {
      console.error('Error fetching recurring expense:', err);
      showError('Error', 'Failed to load recurring expense details');
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.amount || !formData.payerId) {
      showError('Validation Error', 'Please fill in all required fields');
      return;
    }

    if (Number(formData.amount) <= 0) {
      showError('Invalid Amount', 'Amount must be greater than 0');
      return;
    }

    if (Number(formData.interval) < 1) {
      showError('Invalid Interval', 'Interval must be at least 1');
      return;
    }

    setLoading(true);

    try {
      const startDateTime = new Date(formData.startDate).toISOString();
      const endDateTime = formData.endDate ? new Date(formData.endDate).toISOString() : undefined;

      await api.put(`/recurring/${recurringId}`, {
        title: formData.title,
        amount: Number(formData.amount),
        category: formData.category,
        payerId: formData.payerId,
        frequency: formData.frequency,
        interval: Number(formData.interval),
        startDate: startDateTime,
        endDate: endDateTime,
        splitType: formData.splitType,
        active: formData.active,
      });

      showSuccess('Success', 'Recurring expense updated successfully');
      onClose();
      onRecurringUpdated();
    } catch (error: any) {
      console.error('Error updating recurring expense:', error);
      showError('Error', error.response?.data?.error?.message || 'Failed to update recurring expense');
    } finally {
      setLoading(false);
    }
  };

  const getFrequencyLabel = () => {
    const interval = Number(formData.interval) || 1;
    const freqLabel = FREQUENCIES.find(f => f.value === formData.frequency)?.label.toLowerCase() || '';
    return interval === 1 ? freqLabel : `${interval} ${freqLabel}`;
  };

  return (
    <Dialog 
      open={open} 
      onOpenChange={(isOpen) => {
        // Only close if the state is actually changing
        if (!isOpen && open) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Edit Recurring Expense
          </DialogTitle>
          <DialogDescription>
            Update the recurring expense details. Changes will apply to future occurrences.
          </DialogDescription>
        </DialogHeader>

        {fetchLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="edit-title">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                id="edit-title"
                placeholder="e.g., Office Rent, Netflix Subscription"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
            </div>

            {/* Amount & Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-amount">
                  Amount <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                  <SelectTrigger id="edit-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat.charAt(0).toUpperCase() + cat.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Payer */}
            <div className="space-y-2">
              <Label htmlFor="edit-payer">
                Paid By <span className="text-red-500">*</span>
              </Label>
              <Select value={formData.payerId} onValueChange={(value) => setFormData({ ...formData, payerId: value })} required>
                <SelectTrigger id="edit-payer">
                  <SelectValue placeholder="Select who pays" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((member) => (
                    <SelectItem key={member.user.id} value={member.user.id}>
                      {member.user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Frequency & Interval */}
            <div className="space-y-4">
              <Label>Repeat Schedule</Label>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1 space-y-2">
                  <Label htmlFor="edit-interval" className="text-sm">Every</Label>
                  <Input
                    id="edit-interval"
                    type="number"
                    min="1"
                    value={formData.interval}
                    onChange={(e) => setFormData({ ...formData, interval: e.target.value })}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="edit-frequency" className="text-sm">Frequency</Label>
                  <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value as FrequencyType })}>
                    <SelectTrigger id="edit-frequency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((freq) => (
                        <SelectItem key={freq.value} value={freq.value}>
                          {freq.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                ⏰ Repeats every <span className="font-semibold">{getFrequencyLabel()}</span>
              </p>
            </div>

            {/* Start & End Date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-startDate">
                  Start Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="edit-startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-endDate">End Date (Optional)</Label>
                <Input
                  id="edit-endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                  min={formData.startDate}
                />
              </div>
            </div>

            {/* Split Type */}
            <div className="space-y-2">
              <Label htmlFor="edit-splitType">Split Type</Label>
              <Select value={formData.splitType} onValueChange={(value) => setFormData({ ...formData, splitType: value })}>
                <SelectTrigger id="edit-splitType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="equal">Equal Split</SelectItem>
                  <SelectItem value="percentage">Percentage Split</SelectItem>
                  <SelectItem value="shares">Shares Split</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Updating...' : 'Update Recurring Expense'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
