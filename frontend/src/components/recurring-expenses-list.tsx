'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNotification } from '@/contexts/notification-context';
import api from '@/lib/api';
import { CalendarClock, Trash2, Edit, PauseCircle, PlayCircle, Calendar } from 'lucide-react';
import type { RecurringExpense } from '@/types/recurring';
import { CreateRecurringDialog } from './create-recurring-dialog';
import { EditRecurringDialog } from './edit-recurring-dialog';

interface RecurringExpensesListProps {
  groupId: string;
  members: Array<{ id: string; user: { id: string; name: string; email: string } }>;
}

export function RecurringExpensesList({ groupId, members }: RecurringExpensesListProps) {
  const [recurring, setRecurring] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    fetchRecurring();
  }, [groupId]);

  const fetchRecurring = async () => {
    try {
      const { data } = await api.get(`/groups/${groupId}/recurring`);
      setRecurring(data.data || []);
    } catch (err: any) {
      console.error('Error fetching recurring expenses:', err);
      showError('Error', 'Failed to load recurring expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await api.put(`/recurring/${id}`, { active: !currentActive });
      showSuccess('Success', currentActive ? 'Recurring expense paused' : 'Recurring expense resumed');
      fetchRecurring();
    } catch (err: any) {
      showError('Error', err.response?.data?.error?.message || 'Failed to update recurring expense');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recurring expense?')) {
      return;
    }

    try {
      await api.delete(`/recurring/${id}`);
      showSuccess('Success', 'Recurring expense deleted');
      fetchRecurring();
    } catch (err: any) {
      showError('Error', err.response?.data?.error?.message || 'Failed to delete recurring expense');
    }
  };

  const getFrequencyDisplay = (frequency: string, interval: number) => {
    const freqMap: Record<string, string> = {
      daily: interval === 1 ? 'Daily' : `Every ${interval} days`,
      weekly: interval === 1 ? 'Weekly' : `Every ${interval} weeks`,
      monthly: interval === 1 ? 'Monthly' : `Every ${interval} months`,
      yearly: interval === 1 ? 'Yearly' : `Every ${interval} years`,
    };
    return freqMap[frequency] || frequency;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  if (loading) {
    return null; // Don't show loading state
  }

  // Don't render anything if no recurring expenses
  if (recurring.length === 0) {
    return null;
  }

  return (
    <>
      {recurring.map((expense) => (
        <Card 
          key={expense.id} 
          className="relative overflow-hidden border-2 border-purple-200 dark:border-purple-900 bg-gradient-to-br from-purple-50/50 to-white dark:from-purple-950/20 dark:to-background shadow-sm hover:shadow-md transition-all"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
          <CardContent className="relative z-10 p-4 sm:p-5">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <CalendarClock className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                  <h3 className="font-bold text-base sm:text-lg text-purple-900 dark:text-purple-100 truncate">
                    {expense.title}
                  </h3>
                  <Badge variant={expense.active ? 'default' : 'secondary'} className={expense.active ? 'bg-purple-600' : 'bg-gray-400'}>
                    {expense.active ? 'Active' : 'Paused'}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-purple-600/80 dark:text-purple-400/80 mb-2">
                  {expense.category || 'other'} • Paid by {expense.payer?.name || 'Unknown'}
                </p>
                <div className="flex flex-wrap gap-2 items-center text-xs sm:text-sm">
                  <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                    {getFrequencyDisplay(expense.frequency, expense.interval)}
                  </Badge>
                  <span className="text-muted-foreground">Next: {formatDate(expense.nextRunDate)}</span>
                  {expense.endDate && (
                    <>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-muted-foreground">Until: {formatDate(expense.endDate)}</span>
                    </>
                  )}
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xl sm:text-2xl font-bold text-purple-700 dark:text-purple-400">₹{Number(expense.amount).toFixed(2)}</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-3 border-t border-purple-200 dark:border-purple-800">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingId(expense.id)}
                className="h-8"
              >
                <Edit className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleToggleActive(expense.id, expense.active)}
                className="h-8"
              >
                {expense.active ? (
                  <>
                    <PauseCircle className="h-3.5 w-3.5 mr-1" />
                    Pause
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-3.5 w-3.5 mr-1" />
                    Resume
                  </>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-500 hover:bg-red-500/10 h-8"
                onClick={() => handleDelete(expense.id)}
              >
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Edit Dialog */}
      {editingId && (
        <EditRecurringDialog
          recurringId={editingId}
          members={members}
          open={!!editingId}
          onClose={() => setEditingId(null)}
          onRecurringUpdated={fetchRecurring}
        />
      )}
    </>
  );
}
