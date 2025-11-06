'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Filter, ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface ExpenseFilterProps {
  onFilterChange: (filters: ExpenseFilters) => void;
  members: any[];
  onClear: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  showFilters?: boolean;
  onFilterToggle?: (open: boolean) => void;
}

export interface ExpenseFilters {
  searchQuery: string;
  category: string;
  memberId: string;
  sortBy: 'newest' | 'oldest' | 'highest' | 'lowest';
  dateFrom: string;
  dateTo: string;
}

const CATEGORIES = [
  'food',
  'transport',
  'entertainment',
  'shopping',
  'bills',
  'travel',
  'accommodation',
  'health',
  'education',
  'other'
];

export function ExpenseFilter({ 
  onFilterChange, 
  members, 
  onClear,
  searchQuery = '',
  onSearchChange,
  showFilters = false,
  onFilterToggle
}: ExpenseFilterProps) {
  const [mounted, setMounted] = useState(false);
  const [hasBeenOpened, setHasBeenOpened] = useState(false);
  const [filters, setFilters] = useState<ExpenseFilters>({
    searchQuery: '',
    category: 'all',
    memberId: 'all',
    sortBy: 'newest',
    dateFrom: '',
    dateTo: '',
  });

  const [activeFilterCount, setActiveFilterCount] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Track if dialog has ever been opened
  useEffect(() => {
    if (showFilters && !hasBeenOpened) {
      setHasBeenOpened(true);
    }
  }, [showFilters, hasBeenOpened]);

  const handleFilterChange = (key: keyof ExpenseFilters, value: string) => {
    const updatedFilters = { ...filters, [key]: value };
    setFilters(updatedFilters);
    
    // Count active filters
    let count = 0;
    if (updatedFilters.searchQuery) count++;
    if (updatedFilters.category !== 'all') count++;
    if (updatedFilters.memberId !== 'all') count++;
    if (updatedFilters.dateFrom) count++;
    if (updatedFilters.dateTo) count++;
    
    setActiveFilterCount(count);
    onFilterChange(updatedFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters: ExpenseFilters = {
      searchQuery: '',
      category: 'all',
      memberId: 'all',
      sortBy: 'newest',
      dateFrom: '',
      dateTo: '',
    };
    setFilters(clearedFilters);
    setActiveFilterCount(0);
    onFilterChange(clearedFilters);
    onClear();
  };

  return (
    <>
      <Button
        variant={showFilters ? 'default' : 'outline'}
        size="sm"
        onClick={() => onFilterToggle?.(!showFilters)}
        className="relative"
      >
        <Filter className="h-4 w-4" />
        {activeFilterCount > 0 && (
          <span className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
            {activeFilterCount}
          </span>
        )}
      </Button>

      {/* Filter Modal/Overlay - Only render after mount AND after first open to avoid hydration issues */}
      {mounted && hasBeenOpened && (
        <Dialog 
          key="expense-filter-dialog"
          open={showFilters} 
          onOpenChange={(open) => {
            // Prevent infinite loops by only calling when closing
            if (!open && showFilters) {
              onFilterToggle?.(false);
            }
          }}
        >
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Filter Expenses</span>
              {activeFilterCount > 0 && (
                <span className="ml-2 px-2 py-1 text-xs font-semibold bg-red-500 text-white rounded-full">
                  {activeFilterCount} active
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Sort */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Sort By</Label>
              <Select value={filters.sortBy} onValueChange={(val: any) => handleFilterChange('sortBy', val)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="highest">Highest Amount</SelectItem>
                  <SelectItem value="lowest">Lowest Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category Filter */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Category</Label>
              <Select value={filters.category} onValueChange={(val) => handleFilterChange('category', val)}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat} className="capitalize">
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Member Filter */}
            {members.length > 0 && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Paid By</Label>
                <Select value={filters.memberId} onValueChange={(val) => handleFilterChange('memberId', val)}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Members</SelectItem>
                    {members.map(member => (
                      <SelectItem key={member.userId} value={member.userId}>
                        {member.user.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="dateFrom" className="text-sm font-medium">From Date</Label>
                <Input
                  id="dateFrom"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                  className="h-10"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dateTo" className="text-sm font-medium">To Date</Label>
                <Input
                  id="dateTo"
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                  className="h-10"
                />
              </div>
            </div>

            {/* Clear Button */}
            {activeFilterCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearFilters}
                className="w-full"
              >
                <X className="h-4 w-4 mr-2" />
                Clear All Filters
              </Button>
            )}
          </div>
        </DialogContent>
        </Dialog>
      )}
    </>
  );
}
