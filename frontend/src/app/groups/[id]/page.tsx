'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Header } from '@/components/header';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AddMemberDialog from '@/components/add-member-dialog';
import { RecurringExpensesList } from '@/components/recurring-expenses-list';
import { CreateRecurringDialog } from '@/components/create-recurring-dialog';
import { ReceiptUploadDialog } from '@/components/receipt-upload-dialog';
import { Users, Receipt, TrendingUp, ArrowLeft, RefreshCw, Trash2, Archive, Upload, Image as ImageIcon, Plus, X, ReceiptText, Repeat, Calendar } from 'lucide-react';
import { useNotification } from '@/contexts/notification-context';
import { ExpenseFilter, ExpenseFilters } from '@/components/expense-filter';

function ExpenseList({ groupId, refreshKey, members }: { groupId: string; refreshKey: number; members: any[] }) {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [showFilterDialog, setShowFilterDialog] = useState(false);
  const [filters, setFilters] = useState<ExpenseFilters>({
    searchQuery: '',
    category: 'all',
    memberId: 'all',
    sortBy: 'newest',
    dateFrom: '',
    dateTo: '',
  });
  const router = useRouter();

  useEffect(() => {
    fetchExpenses();
  }, [groupId, refreshKey]);

  useEffect(() => {
    applyFilters(expenses);
  }, [filters]);

  const fetchExpenses = async () => {
    try {
      const { data } = await api.get(`/expenses/group/${groupId}`);
      setExpenses(data.data.expenses);
      applyFilters(data.data.expenses);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = (expenseList: any[]) => {
    let filtered = [...expenseList];

    // Search filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(exp =>
        exp.description.toLowerCase().includes(query) ||
        exp.creator.name.toLowerCase().includes(query)
      );
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(exp => exp.category === filters.category);
    }

    // Member filter
    if (filters.memberId !== 'all') {
      filtered = filtered.filter(exp => exp.creatorId === filters.memberId);
    }

    // Date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom);
      filtered = filtered.filter(exp => new Date(exp.createdAt) >= fromDate);
    }

    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo);
      toDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(exp => new Date(exp.createdAt) <= toDate);
    }

    // Sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'highest':
          return b.amount - a.amount;
        case 'lowest':
          return a.amount - b.amount;
        case 'newest':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    setFilteredExpenses(filtered);
  };

  const handleFilterChange = (newFilters: ExpenseFilters) => {
    setFilters(newFilters);
    applyFilters(expenses);
  };

  const handleClearFilters = () => {
    setFilteredExpenses(expenses);
  };

  const handleUploadSuccess = () => {
    setUploadDialogOpen(false);
    fetchExpenses(); // Refresh expenses list
  };

  if (loading) return (
    <Card>
      <CardContent className="p-8 text-center">
        <p className="text-muted-foreground">Loading...</p>
      </CardContent>
    </Card>
  );

  return (
    <>
      {/* Search and Filter Controls */}
      <div className="mb-4">
        <div className="hidden sm:flex items-center gap-2">
          <Input
            type="text"
            placeholder="Search expenses..."
            value={filters.searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange({ ...filters, searchQuery: e.target.value })}
            className="h-9 flex-1 max-w-xs"
          />
          {expenses.length > 0 && (
            <ExpenseFilter 
              onFilterChange={handleFilterChange} 
              members={members}
              onClear={handleClearFilters}
              showFilters={showFilterDialog}
              onFilterToggle={setShowFilterDialog}
            />
          )}
        </div>
        <div className="sm:hidden space-y-2">
          <Input
            type="text"
            placeholder="Search expenses..."
            value={filters.searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleFilterChange({ ...filters, searchQuery: e.target.value })}
            className="h-9"
          />
          {expenses.length > 0 && (
            <ExpenseFilter 
              onFilterChange={handleFilterChange} 
              members={members}
              onClear={handleClearFilters}
              showFilters={showFilterDialog}
              onFilterToggle={setShowFilterDialog}
            />
          )}
        </div>
      </div>
      
      {/* Expenses List */}
      {filteredExpenses.length === 0 && expenses.length === 0 ? (
        <Card className="relative overflow-hidden border-dashed" suppressHydrationWarning>
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <CardContent className="relative z-10 text-center py-8 sm:py-12">
            <ImageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-2">No expenses yet</p>
            <p className="text-xs sm:text-sm text-muted-foreground/70 mb-4 md:hidden">
              Use the + button below to add expenses
            </p>
            <div className="hidden md:flex flex-col sm:flex-row gap-2 justify-center">
              <Button 
                onClick={() => setUploadDialogOpen(true)} 
                variant="outline" 
                size="sm"
                data-upload-receipt-btn
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Receipt
              </Button>
              <Button onClick={() => router.push(`/expenses?groupId=${groupId}`)} size="sm">
                + Add Manually
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : filteredExpenses.length === 0 ? (
        <Card className="relative overflow-hidden border-dashed">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent pointer-events-none" />
          <CardContent className="relative z-10 text-center py-8 sm:py-12">
            <ImageIcon className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-2">No expenses match your filters</p>
            <p className="text-xs sm:text-sm text-muted-foreground/70">Try adjusting your search criteria</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {filteredExpenses.map((expense) => {
            const expenseDate = new Date(expense.createdAt);
            const day = expenseDate.getDate();
            const month = expenseDate.toLocaleDateString('en-US', { month: 'short' });
            
            return (
              <div 
                key={expense.id} 
                className="group relative overflow-hidden rounded-lg sm:rounded-xl border border-border/50 bg-gradient-to-br from-background to-muted/10 hover:border-primary/30 hover:shadow-md transition-all duration-200 active:scale-[0.99]"
              >
                {/* Hover gradient effect */}
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                
                <div className="relative p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    {/* Date Badge */}
                    <div className="flex-shrink-0 flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-primary/10 border border-primary/20">
                      <span className="text-lg sm:text-xl font-bold text-primary leading-none">{day}</span>
                      <span className="text-[10px] sm:text-xs font-medium text-primary/70 uppercase mt-0.5">{month}</span>
                    </div>
                    
                    {/* Middle: Expense Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1.5">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-sm sm:text-base truncate">{expense.description}</h3>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1">
                            <span className="text-xs text-muted-foreground">
                              by {expense.creator.name}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium capitalize">
                              {expense.category}
                            </span>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-xs text-muted-foreground capitalize">
                              {expense.splitType}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Receipt indicator */}
                      {expense.receiptId && (
                        <div className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded-md bg-primary/5 w-fit">
                          <ImageIcon className="h-3 w-3 text-primary flex-shrink-0" />
                          <span className="text-xs font-medium text-primary">Receipt</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Right: Amount */}
                    <div className="flex flex-col items-end flex-shrink-0">
                      <p className="font-bold text-lg sm:text-xl bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                        ₹{Number(expense.amount).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden button to trigger upload from FAB */}
      <button
        onClick={() => setUploadDialogOpen(true)}
        data-upload-receipt-btn
        className="hidden"
        aria-hidden="true"
      />

      <ReceiptUploadDialog
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
        groupId={groupId}
        onUploadSuccess={handleUploadSuccess}
      />
    </>
  );
}

export default function GroupDetailPage() {
  const [group, setGroup] = useState<any>(null);
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [recalculating, setRecalculating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [autoSettle, setAutoSettle] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showRecurringDialog, setShowRecurringDialog] = useState(false);
  const router = useRouter();
  const params = useParams();
  const { showSuccess, showError } = useNotification();

  // Handle mounting to avoid hydration errors
  useEffect(() => {
    setMounted(true);
  }, []);

  const user = mounted ? getUser() : null;

  // Refresh data when page becomes visible (user returns from another page)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setRefreshKey(prev => prev + 1);
      }
    };

    // Also listen for focus events
    const handleFocus = () => {
      setRefreshKey(prev => prev + 1);
    };

    // Listen for global refresh events
    const handleGlobalRefresh = () => {
      setRefreshKey(prev => prev + 1);
    };

    // Listen for storage events (cross-tab sync)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'last-refresh') {
        setRefreshKey(prev => prev + 1);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('data-refresh', handleGlobalRefresh);
    window.addEventListener('storage', handleStorage);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('data-refresh', handleGlobalRefresh);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    fetchGroup();
    fetchBalances();
  }, [params.id, refreshKey, mounted]);

  const fetchGroup = async () => {
    try {
      const { data } = await api.get(`/groups/${params.id}`);
      setGroup(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBalances = async () => {
    try {
      const { data } = await api.get(`/groups/${params.id}`);
      setBalances(data.data.balances || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleRecalculateBalances = async () => {
    if (recalculating) return;
    
    setRecalculating(true);
    try {
      console.log('===== RECALCULATE BUTTON CLICKED =====');
      console.log('Group ID:', params.id);
      
      const response = await api.post(`/groups/${params.id}/recalculate-balances`);
      console.log('✅ Recalculation SUCCESS:', response.data);
      
      showSuccess('Balances Recalculated', 'All balances have been rebuilt from scratch');
      
      // Wait a bit then refresh
      setTimeout(() => {
        setRefreshKey(prev => prev + 1);
      }, 500);
    } catch (err: any) {
      console.error('❌ Recalculation ERROR:', err);
      console.error('Error details:', err.response);
      showError('Recalculation Failed', err.response?.data?.error?.message || 'Failed to recalculate balances');
    } finally {
      setRecalculating(false);
    }
  };

  const handleArchiveGroup = async () => {
    if (!confirm('Archive this group? You can view archived groups later. The group and all its data will be preserved but hidden from the active groups list.')) {
      return;
    }

    setIsArchiving(true);
    try {
      await api.post(`/groups/${params.id}/archive`);
      showSuccess('Group Archived', 'Group has been archived successfully');
      router.push('/groups');
    } catch (err: any) {
      console.error('Archive error:', err);
      const errorMessage = err.response?.data?.error?.message || 'Failed to archive group';
      showError('Archive Failed', errorMessage);
    } finally {
      setIsArchiving(false);
    }
  };

  const handleDeleteGroup = async () => {
    // First check if all balances are settled
    const hasUnsettledBalances = balances.some(b => b.amount !== 0);
    
    if (hasUnsettledBalances) {
      // Show dialog with auto-settle option
      setShowDeleteDialog(true);
    } else {
      // All settled, just show confirmation
      setShowDeleteDialog(true);
    }
  };

  const confirmDelete = async () => {
    const hasUnsettledBalances = balances.some(b => b.amount !== 0);
    
    console.log('===== CONFIRM DELETE =====');
    console.log('Has unsettled balances:', hasUnsettledBalances);
    console.log('Auto-settle enabled:', autoSettle);
    console.log('Balances:', balances);
    
    if (hasUnsettledBalances && !autoSettle) {
      showError('Unsettled Balances', 'Please enable auto-settle or settle all payments manually first');
      return;
    }

    setShowDeleteDialog(false);
    setIsDeleting(true);
    
    try {
      // Delete the group with auto-settle parameter
      console.log('�️ Deleting group with autoSettle:', autoSettle);
      
      const deleteUrl = autoSettle 
        ? `/groups/${params.id}?autoSettle=true`
        : `/groups/${params.id}`;
      
      await api.delete(deleteUrl);
      
      showSuccess('Group Deleted', 'Group has been permanently deleted');
      router.push('/groups');
    } catch (err: any) {
      console.error('Delete error:', err);
      const errorMessage = err.response?.data?.error?.message || 'Failed to delete group';
      showError('Delete Failed', errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  if (!mounted || loading) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-sm text-muted-foreground">Loading group...</p>
        </div>
      </div>
    </div>
  );

  if (!user) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-sm text-muted-foreground">Redirecting...</p>
      </div>
    </div>
  );
  
  if (!group) return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-sm text-muted-foreground">Group not found</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0" suppressHydrationWarning>
      <Header />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 pt-2 pb-3 sm:py-4 md:py-4">
        {/* Header Section */}
        <div className="mb-2 sm:mb-6 md:mb-4">
          {/* Top Navigation Bar */}
          <div className="mb-2 sm:mb-4 md:mb-3">
            <div className="flex items-start justify-between gap-3 md:hidden">
              {/* Mobile: Group name and description on left */}
              <div className="flex-1 min-w-0">
                <h1 className="text-xl font-bold tracking-tight truncate">{group.name}</h1>
                {group.description && (
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{group.description}</p>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
              {/* Add Members Button - Custom Trigger */}
              <Button 
                variant="outline" 
                size="sm"
                className="h-9"
                onClick={() => {
                  // Trigger the AddMemberDialog
                  const addMemberBtn = document.querySelector('[data-add-member-trigger]') as HTMLButtonElement;
                  addMemberBtn?.click();
                }}
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">Add Member</span>
              </Button>
              
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRecalculateBalances}
                disabled={recalculating}
                className="h-9"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:inline ml-2">{recalculating ? 'Fixing...' : 'Fix Balances'}</span>
              </Button>
              
              {/* Show archive and delete buttons only for group creator */}
              {user && group.createdBy === user.id && (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleArchiveGroup}
                    disabled={isArchiving}
                    className="text-orange-600 hover:text-orange-700 h-9"
                  >
                    <Archive className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">{isArchiving ? 'Archiving...' : 'Archive'}</span>
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={handleDeleteGroup}
                    disabled={isDeleting}
                    className="h-9"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="hidden sm:inline ml-2">{isDeleting ? 'Deleting...' : 'Delete'}</span>
                  </Button>
                </>
              )}
            </div>
            </div>
          </div>
          
          {/* Group Info */}
          <div className="space-y-2 sm:space-y-4">
            {/* Group Name and Buttons - Desktop only */}
            <div className="hidden md:flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight mb-1">{group.name}</h1>
                <p className="text-xs sm:text-sm md:text-base text-muted-foreground">{group.description || 'No description'}</p>
              </div>
              
              {/* Desktop: Action buttons next to group name */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Calendar View Button */}
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-9"
                  onClick={() => router.push(`/calendar?groupId=${params.id}`)}
                >
                  <Calendar className="h-4 w-4" />
                  <span className="ml-2">Calendar</span>
                </Button>
                
                {/* Add Members Button - Custom Trigger */}
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-9"
                  onClick={() => {
                    const addMemberBtn = document.querySelector('[data-add-member-trigger]') as HTMLButtonElement;
                    addMemberBtn?.click();
                  }}
                >
                  <Users className="h-4 w-4" />
                  <span className="ml-2">Add Member</span>
                </Button>
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleRecalculateBalances}
                  disabled={recalculating}
                  className="h-9"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span className="ml-2">{recalculating ? 'Fixing...' : 'Fix Balances'}</span>
                </Button>
                
                {/* Show archive and delete buttons only for group creator */}
                {user && group.createdBy === user.id && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={handleArchiveGroup}
                      disabled={isArchiving}
                      className="text-orange-600 hover:text-orange-700 h-9"
                    >
                      <Archive className="h-4 w-4" />
                      <span className="ml-2">{isArchiving ? 'Archiving...' : 'Archive'}</span>
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={handleDeleteGroup}
                      disabled={isDeleting}
                      className="h-9"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="ml-2">{isDeleting ? 'Deleting...' : 'Delete'}</span>
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Category badge and Members Count - Mobile */}
            <div className="flex items-center justify-between md:hidden">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{group.members.length} member{group.members.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="px-2.5 py-1.5 bg-primary/10 rounded-lg border border-primary/20">
                <span className="text-xs font-semibold capitalize text-primary">{group.category}</span>
              </div>
            </div>
            
            {/* Category and Members Row - Desktop */}
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-primary/10 rounded-lg border border-primary/20">
                <span className="text-xs text-muted-foreground">Category:</span>
                <span className="text-sm font-semibold capitalize text-primary">{group.category}</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="h-4 w-4" />
                <span>{group.members.length} member{group.members.length !== 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>
          
          {/* Balances Section */}
          {balances.length > 0 && (
            <div className="mt-6 sm:mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Outstandings
                </h2>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/settle?groupId=${params.id}&groupName=${encodeURIComponent(group.name)}`)}
                    className="text-xs h-8 font-medium"
                  >
                    💸 Settle
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/simplified-settlements?groupId=${params.id}&groupName=${encodeURIComponent(group.name)}`)}
                    className="text-xs h-8 font-medium"
                  >
                    <TrendingUp className="h-3.5 w-3.5 mr-1.5" />
                    Simplify
                  </Button>
                </div>
              </div>
              
              {/* Balances as simple text list */}
              <div className="p-4 sm:p-5 rounded-xl border border-border/50 bg-gradient-to-br from-background to-muted/10 space-y-2.5">
                {balances.map((b: any, index: number) => (
                  <div 
                    key={b.id}
                    className={`flex items-center justify-between gap-3 py-2 ${index !== balances.length - 1 ? 'border-b border-border/50' : ''}`}
                  >
                    <p className="text-sm sm:text-base flex-1 min-w-0">
                      <span className="font-semibold text-foreground">{b.user.name}</span>
                      {' '}
                      <span className="text-muted-foreground">owes</span>
                      {' '}
                      <span className="font-semibold text-foreground">{b.owesToUser.name}</span>
                    </p>
                    <span className="text-base sm:text-lg font-bold text-primary flex-shrink-0">
                      ₹{Number(b.amount).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* All Expenses Heading */}
          <div className="mt-6 sm:mt-8 mb-4">
            <h2 className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary" />
              All Expenses
            </h2>
          </div>
          </div>

        {/* Main Content - Full Width */}
        <div className="space-y-3 sm:space-y-4 md:space-y-6">
          <ExpenseList groupId={params.id as string} refreshKey={refreshKey} members={group.members} />
          <RecurringExpensesList groupId={params.id as string} members={group.members} />
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[500px] max-w-[calc(100vw-2rem)] mx-auto">
          <DialogHeader>
            <DialogTitle className="text-red-600 text-lg sm:text-xl">Delete Group Permanently?</DialogTitle>
            <DialogDescription className="space-y-3 sm:space-y-4">
              <p className="font-medium text-sm sm:text-base">This action cannot be undone. This will permanently delete:</p>
              <ul className="list-disc list-inside space-y-1 text-xs sm:text-sm pl-2">
                <li>The group &quot;{group?.name}&quot;</li>
                <li>All expenses in this group</li>
                <li>All payment history</li>
                <li>All member associations</li>
              </ul>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Show unsettled balances if any */}
            {balances.some(b => b.amount !== 0) && (
              <div className="space-y-3">
                <p className="text-sm font-medium text-amber-600">⚠️ Unsettled Balances:</p>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded-lg p-3 bg-amber-50">
                  {balances
                    .filter(b => b.amount !== 0)
                    .map((balance, idx) => (
                      <div key={idx} className="text-sm">
                        <span className="font-medium">{balance.user?.name || 'Unknown'}</span>
                        {' owes '}
                        <span className="font-medium">{balance.owesToUser?.name || 'Unknown'}</span>
                        {': '}
                        <span className="text-amber-700 font-semibold">₹{balance.amount}</span>
                      </div>
                    ))}
                </div>

                {/* Auto-settle checkbox */}
                <div className="flex items-start gap-3 p-3 border rounded-lg bg-blue-50 border-blue-200">
                  <input
                    type="checkbox"
                    id="auto-settle"
                    checked={autoSettle}
                    onChange={(e) => setAutoSettle(e.target.checked)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="auto-settle" className="text-sm cursor-pointer flex-1">
                    <span className="font-medium text-blue-900">Automatically settle all balances before deletion</span>
                    <p className="text-xs text-blue-700 mt-1">
                      This will create payment records to settle all outstanding balances automatically.
                    </p>
                  </label>
                </div>
              </div>
            )}

            {balances.some(b => b.amount !== 0) && !autoSettle && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="font-medium">⚠️ Cannot delete with unsettled balances</p>
                <p className="text-xs mt-1">Please enable auto-settle or manually settle all balances first.</p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false);
                setAutoSettle(false);
              }}
              disabled={isDeleting}
              className="w-full sm:w-auto h-10"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting || (balances.some(b => b.amount !== 0) && !autoSettle)}
              className="w-full sm:w-auto h-10 font-semibold"
            >
              {isDeleting ? 'Deleting...' : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Floating Action Button (Mobile Only) */}
      <div className="md:hidden fixed bottom-20 right-4 z-40">
        {/* Menu Options */}
        {showFabMenu && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/20 -z-10"
              onClick={() => setShowFabMenu(false)}
            />
            
            {/* Menu Items */}
            <div className="absolute bottom-16 right-0 flex flex-col gap-2 mb-2">
              {/* Recurring Expense */}
              <button
                onClick={() => {
                  setShowFabMenu(false);
                  router.push(`/recurring-expenses?groupId=${params.id}`);
                }}
                className="flex items-center gap-3 bg-background border-2 border-primary/20 rounded-full py-2 px-4 shadow-lg hover:shadow-xl transition-all hover:border-primary/40 active:scale-95 group"
              >
                <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center group-hover:bg-purple-600 transition-colors">
                  <Repeat className="h-5 w-5 text-white" />
                </div>
                <span className="font-medium text-sm whitespace-nowrap">Recurring Expense</span>
              </button>

              {/* Upload Receipt */}
              <button
                onClick={() => {
                  setShowFabMenu(false);
                  // Trigger upload dialog in ExpenseList component
                  const uploadBtn = document.querySelector('[data-upload-receipt-btn]') as HTMLButtonElement;
                  uploadBtn?.click();
                }}
                className="flex items-center gap-3 bg-background border-2 border-primary/20 rounded-full py-2 px-4 shadow-lg hover:shadow-xl transition-all hover:border-primary/40 active:scale-95 group"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                  <Upload className="h-5 w-5 text-white" />
                </div>
                <span className="font-medium text-sm whitespace-nowrap">Upload Receipt</span>
              </button>

              {/* Add Expense */}
              <button
                onClick={() => {
                  setShowFabMenu(false);
                  router.push(`/expenses?groupId=${params.id}`);
                }}
                className="flex items-center gap-3 bg-background border-2 border-primary/20 rounded-full py-2 px-4 shadow-lg hover:shadow-xl transition-all hover:border-primary/40 active:scale-95 group"
              >
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center group-hover:bg-green-600 transition-colors">
                  <ReceiptText className="h-5 w-5 text-white" />
                </div>
                <span className="font-medium text-sm whitespace-nowrap">Add Expense</span>
              </button>
            </div>
          </>
        )}

        {/* Main FAB Button */}
        <button
          onClick={() => setShowFabMenu(!showFabMenu)}
          className={`w-14 h-14 rounded-2xl bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center ${
            showFabMenu ? 'rotate-45' : ''
          }`}
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      {/* Hidden AddMemberDialog */}
      <div className="hidden">
        <AddMemberDialog 
          groupId={params.id as string} 
          onMemberAdded={() => {
            fetchGroup();
            fetchBalances();
          }}
        />
      </div>

      {/* Create Recurring Expense Dialog */}
      {group && (
        <CreateRecurringDialog
          groupId={params.id as string}
          members={group.members}
          open={showRecurringDialog}
          onOpenChange={setShowRecurringDialog}
          onRecurringCreated={() => {
            setShowRecurringDialog(false);
            setRefreshKey(prev => prev + 1);
          }}
        />
      )}
    </div>
  );
}
