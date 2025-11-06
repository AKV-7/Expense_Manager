'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import { ArrowLeft, Check } from 'lucide-react';
import { getUser } from '@/lib/auth';

interface Member {
  userId: string;
  user: {
    name: string;
  };
}

export default function ConfigureSplitPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [currentSplitType, setCurrentSplitType] = useState(searchParams.get('splitType') || 'equal');
  const splitType = currentSplitType;
  const amount = searchParams.get('amount') || '0';
  const groupId = searchParams.get('groupId') || '';
  const membersParam = searchParams.get('members') || '[]';
  
  const [members, setMembers] = useState<Member[]>([]);
  const [memberSplits, setMemberSplits] = useState<Record<string, { percentage?: number; amount?: number; shares?: number }>>({});

  useEffect(() => {
    if (!getUser()) {
      router.push('/login');
      return;
    }

    try {
      const parsedMembers = JSON.parse(decodeURIComponent(membersParam));
      setMembers(parsedMembers);
      
      // Initialize splits based on split type
      if (splitType === 'shares') {
        const initialShares: Record<string, { shares: number }> = {};
        parsedMembers.forEach((member: Member) => {
          initialShares[member.userId] = { shares: 1 };
        });
        setMemberSplits(initialShares);
      } else if (splitType === 'percentage') {
        // Clear existing splits when switching to percentage
        setMemberSplits({});
      } else if (splitType === 'exact') {
        // Clear existing splits when switching to exact
        setMemberSplits({});
      }
    } catch (error) {
      console.error('Error parsing members:', error);
    }
  }, [membersParam, splitType, router]);

  const handleSplitTypeChange = (newType: string) => {
    setCurrentSplitType(newType);
    
    // Reset member splits when changing split type
    if (newType === 'shares') {
      const initialShares: Record<string, { shares: number }> = {};
      members.forEach((member) => {
        initialShares[member.userId] = { shares: 1 };
      });
      setMemberSplits(initialShares);
    } else {
      setMemberSplits({});
    }
  };

  const handleSave = () => {
    // Save split configuration to localStorage
    const splitConfig = {
      splitType,
      memberSplits,
      timestamp: Date.now()
    };
    localStorage.setItem('expenseSplitConfig', JSON.stringify(splitConfig));
    
    // Redirect back to expense page
    router.back();
  };

  const handleCancel = () => {
    router.back();
  };

  const isValid = () => {
    if (splitType === 'percentage') {
      const total = Object.values(memberSplits).reduce((sum, s) => sum + (s.percentage || 0), 0);
      return Math.abs(total - 100) < 0.01;
    }
    
    if (splitType === 'exact') {
      const allocated = Object.values(memberSplits).reduce((sum, s) => sum + (s.amount || 0), 0);
      const totalAmount = parseFloat(amount);
      return Math.abs(allocated - totalAmount) < 0.01;
    }
    
    return true; // shares is always valid
  };

  const getTotalPercentage = () => {
    return Object.values(memberSplits).reduce((sum, s) => sum + (s.percentage || 0), 0);
  };

  const getTotalAllocated = () => {
    return Object.values(memberSplits).reduce((sum, s) => sum + (s.amount || 0), 0);
  };

  const getTotalShares = () => {
    return Object.values(memberSplits).reduce((sum, s) => sum + (s.shares || 1), 0);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-2xl mx-auto px-6 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                className="p-2 h-auto"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <CardTitle>Configure Split</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Choose how to split the expense among members
                </p>
              </div>
            </div>

            {/* Scrollable Split Type Tabs */}
            <div className="mt-6 -mx-6 px-6 overflow-x-auto">
              <div className="flex gap-2 min-w-max pb-2">
                <button
                  onClick={() => handleSplitTypeChange('equal')}
                  className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                    splitType === 'equal'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  ✓ Equal Split
                </button>
                <button
                  onClick={() => handleSplitTypeChange('percentage')}
                  className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                    splitType === 'percentage'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  % By Percentage
                </button>
                <button
                  onClick={() => handleSplitTypeChange('exact')}
                  className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                    splitType === 'exact'
                      ? 'bg-green-600 text-white shadow-md'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  ₹ Exact Amounts
                </button>
                <button
                  onClick={() => handleSplitTypeChange('shares')}
                  className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all whitespace-nowrap ${
                    splitType === 'shares'
                      ? 'bg-orange-600 text-white shadow-md'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                  }`}
                >
                  # By Shares
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Summary Info */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="font-semibold">₹{parseFloat(amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Split Type:</span>
                <span className="font-semibold capitalize">{splitType}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Members:</span>
                <span className="font-semibold">{members.length}</span>
              </div>
            </div>

            {/* Members Split Configuration */}
            <div className="space-y-4">
              <h3 className="font-semibold">Configure Split for Each Member</h3>
              
              <div className="space-y-3">
                {members.map((member) => (
                  <div key={member.userId} className="border border-border rounded-lg p-4 space-y-3">
                    <div className="font-medium">{member.user.name}</div>
                    
                    {/* Equal Split - Read Only */}
                    {splitType === 'equal' && (
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-muted-foreground">Amount per person:</span>
                        <span className="text-lg font-semibold text-blue-600">
                          ₹{(parseFloat(amount) / members.length).toFixed(2)}
                        </span>
                      </div>
                    )}
                    
                    {/* Percentage Split */}
                    {splitType === 'percentage' && (
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={memberSplits[member.userId]?.percentage || ''}
                              onChange={(e) => {
                                setMemberSplits({
                                  ...memberSplits,
                                  [member.userId]: { percentage: parseFloat(e.target.value) || 0 }
                                });
                              }}
                              placeholder="0.0"
                              className="w-28 px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <span className="text-sm font-medium">%</span>
                            {memberSplits[member.userId]?.percentage && (
                              <span className="text-sm text-muted-foreground">
                                = ₹{((parseFloat(amount) * (memberSplits[member.userId]?.percentage || 0)) / 100).toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Exact Amount Split */}
                    {splitType === 'exact' && (
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">₹</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={memberSplits[member.userId]?.amount || ''}
                              onChange={(e) => {
                                setMemberSplits({
                                  ...memberSplits,
                                  [member.userId]: { amount: parseFloat(e.target.value) || 0 }
                                });
                              }}
                              placeholder="0.00"
                              className="w-36 px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Shares Split */}
                    {splitType === 'shares' && (
                      <div className="flex items-center gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={memberSplits[member.userId]?.shares || 1}
                              onChange={(e) => {
                                setMemberSplits({
                                  ...memberSplits,
                                  [member.userId]: { shares: parseInt(e.target.value) || 1 }
                                });
                              }}
                              className="w-24 px-3 py-2 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                            />
                            <span className="text-sm font-medium">shares</span>
                            {(() => {
                              const totalShares = getTotalShares();
                              const memberShares = memberSplits[member.userId]?.shares || 1;
                              return totalShares > 0 && (
                                <span className="text-sm text-muted-foreground">
                                  = ₹{((parseFloat(amount) * memberShares) / totalShares).toFixed(2)}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Validation Summary */}
            <div className="border-t border-border pt-4">
              {splitType === 'equal' && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                  <div className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-blue-600" />
                    <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Split equally among {members.length} members
                    </span>
                  </div>
                  <span className="font-semibold text-blue-700 dark:text-blue-300">
                    ₹{(parseFloat(amount) / members.length).toFixed(2)} each
                  </span>
                </div>
              )}

              {splitType === 'percentage' && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">Total Percentage:</span>
                  <span className={`font-semibold ${isValid() ? 'text-green-500' : 'text-red-500'}`}>
                    {getTotalPercentage().toFixed(1)}%
                    {isValid() ? ' ✓' : ` (should be 100%)`}
                  </span>
                </div>
              )}

              {splitType === 'exact' && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">Total Allocated:</span>
                  <span className={`font-semibold ${isValid() ? 'text-green-500' : 'text-red-500'}`}>
                    ₹{getTotalAllocated().toFixed(2)} / ₹{parseFloat(amount).toFixed(2)}
                    {isValid() ? ' ✓' : ''}
                  </span>
                </div>
              )}

              {splitType === 'shares' && (
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm font-medium">Total Shares:</span>
                  <span className="font-semibold text-green-500">
                    {getTotalShares()} shares ✓
                  </span>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={!isValid()}
                className="flex-1"
              >
                <Check className="h-4 w-4 mr-2" />
                Save & Continue
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
