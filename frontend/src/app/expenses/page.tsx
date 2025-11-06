'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import { useNotification } from '@/contexts/notification-context';
import { triggerGlobalRefresh } from '@/lib/refresh';

export default function AddExpensePage() {
  const { showSuccess, showError } = useNotification();
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('food');
  const [expenseDate, setExpenseDate] = useState(() => {
    // Default to today's date in YYYY-MM-DD format
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [splitType, setSplitType] = useState('equal');
  const [members, setMembers] = useState<any[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [memberSplits, setMemberSplits] = useState<Record<string, { percentage?: number; amount?: number; shares?: number }>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!getUser()) {
      router.push('/login');
      return;
    }
    fetchGroups();
    
    // Load saved split configuration from localStorage
    const savedConfig = localStorage.getItem('expenseSplitConfig');
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        // Check if config is recent (within 5 minutes)
        if (Date.now() - config.timestamp < 5 * 60 * 1000) {
          setSplitType(config.splitType);
          setMemberSplits(config.memberSplits);
        }
        // Clear the saved config
        localStorage.removeItem('expenseSplitConfig');
      } catch (error) {
        console.error('Error loading split config:', error);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  useEffect(() => {
    const groupId = searchParams.get('groupId');
    if (groupId) {
      setSelectedGroup(groupId);
      fetchGroupMembers(groupId);
    }
  }, [searchParams]);

  const fetchGroups = async () => {
    try {
      const { data } = await api.get('/groups');
      setGroups(data.data.groups);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const { data } = await api.get(`/groups/${groupId}`);
      setMembers(data.data.members);
      setSelectedMembers(data.data.members.map((m: any) => m.userId));
    } catch (err) {
      console.error(err);
    }
  };

  const handleGroupChange = (groupId: string) => {
    setSelectedGroup(groupId);
    fetchGroupMembers(groupId);
  };

  const handleSplitTypeChange = (newSplitType: string) => {
    setSplitType(newSplitType);
    
    // If not equal split, redirect to configuration page
    if (newSplitType !== 'equal') {
      // Check if required fields are filled
      if (!amount) {
        showError('Amount Required', 'Please enter the expense amount first');
        setSplitType('equal'); // Reset to equal
        return;
      }
      if (!selectedGroup || members.length === 0) {
        showError('Group Required', 'Please select a group first');
        setSplitType('equal'); // Reset to equal
        return;
      }
      
      // Redirect to configuration page
      const membersData = encodeURIComponent(JSON.stringify(members));
      router.push(`/expenses/configure-split?splitType=${newSplitType}&amount=${amount}&groupId=${selectedGroup}&members=${membersData}`);
    } else {
      // Reset splits for equal type
      setMemberSplits({});
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const currentUser = getUser();
      
      // Build participants array based on split type
      let participants = selectedMembers.map(userId => {
        const split = memberSplits[userId] || {};
        return {
          userId,
          ...(splitType === 'percentage' && { sharePercentage: split.percentage || 0 }),
          ...(splitType === 'exact' && { owedAmount: split.amount || 0 }),
          ...(splitType === 'shares' && { shareCount: split.shares || 1 }),
        };
      });

      await api.post('/expenses', {
        groupId: selectedGroup,
        description,
        amount: parseFloat(amount),
        category,
        splitType,
        payerId: currentUser.id,
        participants,
        createdAt: new Date(expenseDate).toISOString(), // Send the selected date
      });

      showSuccess(
        'Expense Created',
        `Successfully added "${description}" for ₹${amount}`
      );
      
      // Trigger global refresh so dashboard and other pages update
      triggerGlobalRefresh();
      
      router.push(`/groups/${selectedGroup}`);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error?.message || 'Failed to create expense';
      setError(errorMsg);
      showError('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-2xl mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <CardTitle>Create New Expense</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 p-3 rounded mb-4 text-sm">
                {error}
              </div>
            )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Group</label>
              <select
                value={selectedGroup}
                onChange={(e) => handleGroupChange(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">Select a group</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g., Dinner at Pizza Hut"
                className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Date</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]} // Can't select future dates
                className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-100"
                style={{ colorScheme: 'dark' }}
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Click to select a date. Defaults to today.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Amount (₹)</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="food">Food & Dining</option>
                <option value="transport">Transportation</option>
                <option value="entertainment">Entertainment</option>
                <option value="shopping">Shopping</option>
                <option value="utilities">Utilities</option>
                <option value="housing">Housing</option>
                <option value="travel">Travel</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Split Type</label>
              <div className="flex gap-2">
                <select
                  value={splitType}
                  onChange={(e) => handleSplitTypeChange(e.target.value)}
                  className="flex-1 px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="equal">Split Equally</option>
                  <option value="percentage">By Percentage</option>
                  <option value="exact">Exact Amounts</option>
                  <option value="shares">By Shares</option>
                </select>
                {splitType !== 'equal' && Object.keys(memberSplits).length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleSplitTypeChange(splitType)}
                    className="whitespace-nowrap"
                  >
                    Configure
                  </Button>
                )}
              </div>
              {splitType !== 'equal' && Object.keys(memberSplits).length === 0 && (
                <p className="text-xs text-amber-500 mt-1">
                  ⚠ Will redirect to configuration page
                </p>
              )}
              {splitType !== 'equal' && Object.keys(memberSplits).length > 0 && (
                <p className="text-xs text-green-500 mt-1">
                  ✓ Split configured - Click "Configure" to modify
                </p>
              )}
            </div>

            {members.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-2">
                  Split With
                  {splitType === 'equal' && amount && selectedMembers.length > 0 && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (₹{(parseFloat(amount) / selectedMembers.length).toFixed(2)} each)
                    </span>
                  )}
                </label>
                <div className="space-y-2 border border-border rounded-lg p-4">
                  {members.map((member) => (
                    <label key={member.userId} className="flex items-center justify-between">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedMembers.includes(member.userId)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedMembers([...selectedMembers, member.userId]);
                            } else {
                              setSelectedMembers(selectedMembers.filter(id => id !== member.userId));
                              // Clear split value when unchecked
                              const newSplits = { ...memberSplits };
                              delete newSplits[member.userId];
                              setMemberSplits(newSplits);
                            }
                          }}
                          className="mr-3 w-4 h-4"
                        />
                        <span className="font-medium">{member.user.name}</span>
                      </div>
                      
                      {/* Show configured amount for non-equal splits */}
                      {splitType !== 'equal' && memberSplits[member.userId] && (
                        <span className="text-sm text-muted-foreground">
                          {splitType === 'percentage' && `${memberSplits[member.userId].percentage}%`}
                          {splitType === 'exact' && `₹${memberSplits[member.userId].amount?.toFixed(2)}`}
                          {splitType === 'shares' && `${memberSplits[member.userId].shares} shares`}
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading || !selectedGroup || selectedMembers.length < 1}
              className="w-full"
            >
              {loading ? 'Creating...' : 'Create Expense'}
            </Button>
          </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
