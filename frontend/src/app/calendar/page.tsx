'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Header } from '@/components/header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNotification } from '@/contexts/notification-context';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Receipt } from 'lucide-react';

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  createdAt: string;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
  group?: {
    id: string;
    name: string;
  };
}

const CATEGORY_COLORS: Record<string, string> = {
  food: 'bg-orange-500',
  transport: 'bg-blue-500',
  entertainment: 'bg-purple-500',
  shopping: 'bg-pink-500',
  bills: 'bg-red-500',
  travel: 'bg-cyan-500',
  accommodation: 'bg-indigo-500',
  health: 'bg-green-500',
  education: 'bg-yellow-500',
  other: 'bg-gray-500',
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface Group {
  id: string;
  name: string;
  description?: string;
}

export default function CalendarPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const groupIdFromUrl = searchParams.get('groupId');
  const { showError } = useNotification();

  const [mounted, setMounted] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(groupIdFromUrl);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Memoize user to prevent re-renders
  const user = useMemo(() => {
    return mounted ? getUser() : null;
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    
    if (!user) {
      router.push('/login');
      return;
    }

    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  useEffect(() => {
    if (!mounted || !selectedGroupId) return;
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, selectedGroupId]);

  const fetchGroups = async () => {
    try {
      const { data } = await api.get('/groups');
      const fetchedGroups = data.data.groups || [];
      setGroups(fetchedGroups);
      
      // Auto-select group if not already selected
      if (!selectedGroupId && fetchedGroups.length > 0) {
        // If there's only one group, auto-select it
        if (fetchedGroups.length === 1) {
          setSelectedGroupId(fetchedGroups[0].id);
        }
        // Otherwise, if groupIdFromUrl exists, use it
        else if (groupIdFromUrl) {
          setSelectedGroupId(groupIdFromUrl);
        } else {
          // Multiple groups but no URL param - stop loading, show selector
          setLoading(false);
        }
      } else if (fetchedGroups.length === 0) {
        // No groups at all - stop loading
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Error fetching groups:', err);
      showError('Error', 'Failed to load groups');
      setLoading(false);
    }
  };

  const fetchExpenses = async () => {
    if (!selectedGroupId) return;
    
    try {
      setLoading(true);
      const { data } = await api.get(`/expenses/group/${selectedGroupId}`);
      setExpenses(data.data.expenses || data.data || []);
    } catch (err: any) {
      console.error('Error fetching expenses:', err);
      showError('Error', 'Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  // Memoize expensive calculations
  // Get expenses for a specific date
  const getExpensesForDate = useCallback((date: Date): Expense[] => {
    return expenses.filter(expense => {
      const expenseDate = new Date(expense.createdAt);
      return (
        expenseDate.getDate() === date.getDate() &&
        expenseDate.getMonth() === date.getMonth() &&
        expenseDate.getFullYear() === date.getFullYear()
      );
    });
  }, [expenses]);

  // Get total amount for a specific date
  const getTotalForDate = useCallback((date: Date): number => {
    const dayExpenses = getExpensesForDate(date);
    return dayExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  }, [getExpensesForDate]);

  // Generate calendar days - memoized to prevent recalculation on every render
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startingDayOfWeek = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: (Date | null)[] = [];

    // Add empty cells for days before month starts
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= totalDays; day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }, [currentDate]); // Only recalculate when currentDate changes

  // Memoize monthly summary data to avoid filtering twice in render
  const monthlyExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const expDate = new Date(exp.createdAt);
      return expDate.getMonth() === currentDate.getMonth() &&
             expDate.getFullYear() === currentDate.getFullYear();
    });
  }, [expenses, currentDate]);

  const monthlyTotal = useMemo(() => {
    return monthlyExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  }, [monthlyExpenses]);

  // Memoize selected day expenses
  const selectedDayExpenses = useMemo(() => {
    return selectedDate ? getExpensesForDate(selectedDate) : [];
  }, [selectedDate, getExpensesForDate]);

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1));
    setSelectedDate(null);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1));
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDate(new Date());
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <p className="text-sm text-muted-foreground">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-8">
      <Header />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <CalendarIcon className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
              Expense Calendar
            </h1>
            <Button
              size="sm"
              onClick={goToToday}
              className="h-8 sm:h-9"
            >
              Today
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {selectedGroupId ? 'Group expenses in calendar view' : 'Select a group to view expenses'}
          </p>
        </div>

        {/* Group Selector */}
        {groups.length > 1 && (
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <label className="text-sm font-medium whitespace-nowrap">Select Group:</label>
                <Select value={selectedGroupId || ''} onValueChange={setSelectedGroupId}>
                  <SelectTrigger className="w-full sm:w-[300px]">
                    <SelectValue placeholder="Choose a group" />
                  </SelectTrigger>
                  <SelectContent>
                    {groups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {!selectedGroupId && groups.length === 0 && (
          <Card className="mb-4">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground mb-4">You don't have any groups yet.</p>
              <Button onClick={() => router.push('/groups')}>
                Create Your First Group
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Calendar Navigation */}
        {selectedGroupId && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={previousMonth}
                className="h-9"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Prev</span>
              </Button>

              <h2 className="text-lg sm:text-xl font-bold">
                {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
              </h2>

              <Button
                variant="outline"
                size="sm"
                onClick={nextMonth}
                className="h-9"
              >
                <span className="hidden sm:inline mr-1">Next</span>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Calendar Grid */}
        {selectedGroupId && (
        <Card className="mb-4">
          <CardContent className="p-2 sm:p-4">
            {/* Day names */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAY_NAMES.map(day => (
                <div
                  key={day}
                  className="text-center text-xs sm:text-sm font-semibold text-muted-foreground py-2"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar days */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((date, index) => {
                if (!date) {
                  return <div key={`empty-${index}`} className="aspect-square" />;
                }

                const dayExpenses = getExpensesForDate(date);
                const total = getTotalForDate(date);
                const isToday = 
                  date.getDate() === new Date().getDate() &&
                  date.getMonth() === new Date().getMonth() &&
                  date.getFullYear() === new Date().getFullYear();
                const isSelected = 
                  selectedDate &&
                  date.getDate() === selectedDate.getDate() &&
                  date.getMonth() === selectedDate.getMonth() &&
                  date.getFullYear() === selectedDate.getFullYear();

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDate(date)}
                    className={`
                      aspect-square p-1 sm:p-2 rounded-lg border transition-all
                      ${isToday ? 'border-primary border-2 bg-primary/5' : 'border-border'}
                      ${isSelected ? 'bg-primary/10 ring-2 ring-primary' : 'hover:bg-muted'}
                      ${dayExpenses.length > 0 ? 'cursor-pointer' : 'cursor-default'}
                    `}
                  >
                    <div className="h-full flex flex-col items-center justify-between">
                      <span className={`text-xs sm:text-sm font-medium ${isToday ? 'text-primary font-bold' : ''}`}>
                        {date.getDate()}
                      </span>
                      
                      {dayExpenses.length > 0 && (
                        <div className="flex flex-col items-center gap-0.5 w-full">
                          <div className="flex gap-0.5 flex-wrap justify-center">
                            {dayExpenses.slice(0, 3).map((exp, i) => (
                              <div
                                key={i}
                                className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${
                                  CATEGORY_COLORS[exp.category] || 'bg-gray-500'
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-[8px] sm:text-[10px] font-semibold text-primary">
                            ₹{total.toFixed(0)}
                          </span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>
        )}

        {/* Selected Day Expenses */}
        {selectedGroupId && selectedDate && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold text-lg mb-3 flex items-center justify-between">
                <span>
                  {selectedDate.toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
                <Badge variant="secondary">
                  {selectedDayExpenses.length} expense{selectedDayExpenses.length !== 1 ? 's' : ''}
                </Badge>
              </h3>

              {selectedDayExpenses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Receipt className="h-12 w-12 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No expenses on this day</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {selectedDayExpenses.map(expense => (
                    <div
                      key={expense.id}
                      onClick={() => expense.group?.id && router.push(`/groups/${expense.group.id}`)}
                      className="p-3 rounded-lg border border-border hover:bg-muted transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <div className={`w-2 h-2 rounded-full ${CATEGORY_COLORS[expense.category] || CATEGORY_COLORS.other}`} />
                            <p className="font-medium text-sm truncate">
                              {expense.description}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {expense.group?.name && (
                              <>
                                <span>{expense.group.name}</span>
                                <span>•</span>
                              </>
                            )}
                            {expense.creator?.name && (
                              <>
                                <span>{expense.creator.name}</span>
                                <span>•</span>
                              </>
                            )}
                            <Badge variant="outline" className="text-[10px] h-5">
                              {expense.category}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <p className="text-base font-bold text-primary">
                            ₹{Number(expense.amount).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="pt-3 mt-3 border-t border-border">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Total for this day:</span>
                      <span className="text-lg font-bold text-primary">
                        ₹{selectedDayExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Summary Card */}
        {selectedGroupId && !selectedDate && (
          <Card>
            <CardContent className="p-4">
              <h3 className="font-bold text-lg mb-3">
                {MONTH_NAMES[currentDate.getMonth()]} Summary
              </h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between py-2 border-b border-border">
                  <span className="text-sm text-muted-foreground">Total Expenses</span>
                  <span className="font-semibold">
                    {monthlyExpenses.length}
                  </span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-muted-foreground">Total Amount</span>
                  <span className="font-bold text-primary text-lg">
                    ₹{monthlyTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
