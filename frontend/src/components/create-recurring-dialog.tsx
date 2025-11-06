'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotification } from '@/contexts/notification-context';
import api from '@/lib/api';
import { CalendarClock, Plus } from 'lucide-react';
import type { FrequencyType } from '@/types/recurring';

interface CreateRecurringDialogProps {
  groupId: string;
  members: Array<{ id: string; user: { id: string; name: string; email: string } }>;
  onRecurringCreated: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
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

export function CreateRecurringDialog({ 
  groupId, 
  members, 
  onRecurringCreated,
  open: controlledOpen,
  onOpenChange 
}: CreateRecurringDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showSuccess, showError } = useNotification();

  // Use controlled open state if provided, otherwise use internal state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen;
  const setOpen = onOpenChange || setInternalOpen;

  const [formData, setFormData] = useState({
    title: '',
    amount: '',
    category: 'other',
    payerId: '',
    frequency: 'monthly' as FrequencyType,
    interval: '1',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    splitType: 'equal',
  });

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

      await api.post(`/groups/${groupId}/recurring`, {
        title: formData.title,
        amount: Number(formData.amount),
        category: formData.category,
        payerId: formData.payerId,
        frequency: formData.frequency,
        interval: Number(formData.interval),
        startDate: startDateTime,
        endDate: endDateTime,
        splitType: formData.splitType,
      });

      showSuccess('Success', 'Recurring expense created successfully');
      setOpen(false);
      
      // Reset form
      setFormData({
        title: '',
        amount: '',
        category: 'other',
        payerId: '',
        frequency: 'monthly',
        interval: '1',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        splitType: 'equal',
      });

      onRecurringCreated();
    } catch (error: any) {
      console.error('Error creating recurring expense:', error);
      showError('Error', error.response?.data?.error?.message || 'Failed to create recurring expense');
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
        // Only update state if it's actually changing
        if (isOpen !== open) {
          setOpen(isOpen);
        }
      }}
    >
      {/* Only show trigger button if not controlled externally */}
      {controlledOpen === undefined && (
        <DialogTrigger asChild>
          <Button className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Create Recurring Expense
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Create Recurring Expense
          </DialogTitle>
          <DialogDescription>
            Set up an expense that repeats automatically. It will be created on schedule without manual entry.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">
              Title <span className="text-red-500">*</span>
            </Label>
            <Input
              id="title"
              placeholder="e.g., Office Rent, Netflix Subscription"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          {/* Amount & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">
                Amount <span className="text-red-500">*</span>
              </Label>
              <Input
                id="amount"
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
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger id="category">
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
            <Label htmlFor="payer">
              Paid By <span className="text-red-500">*</span>
            </Label>
            <Select value={formData.payerId} onValueChange={(value) => setFormData({ ...formData, payerId: value })} required>
              <SelectTrigger id="payer">
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
                <Label htmlFor="interval" className="text-sm">Every</Label>
                <Input
                  id="interval"
                  type="number"
                  min="1"
                  value={formData.interval}
                  onChange={(e) => setFormData({ ...formData, interval: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="frequency" className="text-sm">Frequency</Label>
                <Select value={formData.frequency} onValueChange={(value) => setFormData({ ...formData, frequency: value as FrequencyType })}>
                  <SelectTrigger id="frequency">
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
              <Label htmlFor="startDate">
                Start Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date (Optional)</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                min={formData.startDate}
              />
            </div>
          </div>

          {/* Split Type */}
          <div className="space-y-2">
            <Label htmlFor="splitType">Split Type</Label>
            <Select value={formData.splitType} onValueChange={(value) => setFormData({ ...formData, splitType: value })}>
              <SelectTrigger id="splitType">
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
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Recurring Expense'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
