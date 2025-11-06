'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotification } from '@/contexts/notification-context';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';
import { ArrowLeft, CalendarClock } from 'lucide-react';
import type { FrequencyType } from '@/types/recurring';

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

export default function RecurringExpensePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupId = searchParams.get('groupId');
  const { showSuccess, showError } = useNotification();
  
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

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

  useEffect(() => {
    setMounted(true);
  }, []);

  const user = mounted ? getUser() : null;

  useEffect(() => {
    if (!mounted) return;
    
    if (!user) {
      router.push('/login');
      return;
    }

    if (!groupId) {
      router.push('/groups');
      return;
    }

    fetchMembers();
  }, [groupId, mounted]);

  const fetchMembers = async () => {
    try {
      const { data } = await api.get(`/groups/${groupId}`);
      setMembers(data.data.members);
      
      // Set current user as default payer
      const currentMember = data.data.members.find((m: any) => m.user.id === user?.id);
      if (currentMember) {
        setFormData(prev => ({ ...prev, payerId: currentMember.user.id }));
      }
    } catch (err) {
      console.error(err);
      showError('Error', 'Failed to load group members');
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
      router.back();
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

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />
      
      <main className="container mx-auto px-4 py-6 max-w-2xl">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          
          <div className="flex items-center gap-3 mb-2">
            <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
              <CalendarClock className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Create Recurring Expense</h1>
              <p className="text-sm text-muted-foreground">Set up an expense that repeats automatically</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="e.g., Monthly Rent, Netflix Subscription"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (₹) *</Label>
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

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
              <SelectTrigger id="category">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat} className="capitalize">
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Paid By */}
          <div className="space-y-2">
            <Label htmlFor="payer">Paid By *</Label>
            <Select value={formData.payerId} onValueChange={(value) => setFormData({ ...formData, payerId: value })}>
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

          {/* Frequency */}
          <div className="space-y-2">
            <Label htmlFor="frequency">Frequency *</Label>
            <Select value={formData.frequency} onValueChange={(value: FrequencyType) => setFormData({ ...formData, frequency: value })}>
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

          {/* Interval */}
          <div className="space-y-2">
            <Label htmlFor="interval">Repeat Every</Label>
            <div className="flex items-center gap-2">
              <Input
                id="interval"
                type="number"
                min="1"
                value={formData.interval}
                onChange={(e) => setFormData({ ...formData, interval: e.target.value })}
                className="w-24"
              />
              <span className="text-sm text-muted-foreground">
                {getFrequencyLabel()}
              </span>
            </div>
          </div>

          {/* Start Date */}
          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date *</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              required
            />
          </div>

          {/* End Date */}
          <div className="space-y-2">
            <Label htmlFor="endDate">End Date (Optional)</Label>
            <Input
              id="endDate"
              type="date"
              value={formData.endDate}
              min={formData.startDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Leave empty for ongoing recurring expense</p>
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
                <SelectItem value="custom">Custom Split</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Submit Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Recurring Expense'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
