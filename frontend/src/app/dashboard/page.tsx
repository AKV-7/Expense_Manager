'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUser, logout } from '@/lib/auth';
import api from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, Users, Receipt, Activity, CreditCard, BarChart3, PieChart } from 'lucide-react';
import { Header } from '@/components/header';

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Refresh data when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && user) {
        fetchDashboard();
      }
    };

    const handleFocus = () => {
      if (user) {
        fetchDashboard();
      }
    };

    // Listen for global refresh events
    const handleGlobalRefresh = () => {
      if (user) {
        fetchDashboard();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('data-refresh', handleGlobalRefresh);
    
    // Listen for storage events (cross-tab)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'last-refresh' && user) {
        fetchDashboard();
      }
    };
    window.addEventListener('storage', handleStorage);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('data-refresh', handleGlobalRefresh);
      window.removeEventListener('storage', handleStorage);
    };
  }, [user]);

  useEffect(() => {
    setMounted(true);
    const userData = getUser();
    if (!userData) {
      router.push('/login');
    } else {
      setUser(userData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  // Fetch dashboard data whenever user changes or component mounts
  useEffect(() => {
    if (user && mounted) {
      fetchDashboard();
    }
  }, [user, mounted]);

  const fetchDashboard = async () => {
    try {
      console.log('Fetching dashboard data...');
      const res = await api.get('/dashboard');
      console.log('Dashboard data received:', res.data.data);
      setData(res.data.data);
    } catch (err) {
      console.error('Failed to fetch dashboard:', err);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  if (!mounted || !user) return null;

  const chartData = data?.recentGroups.map((g: any) => ({
    name: g.name,
    expenses: g._count.expenses,
  })) || [];

  const balanceData = [
    { type: 'You Owe', value: data?.stats.youOwe || 0 },
    { type: 'You Are Owed', value: data?.stats.youAreOwed || 0 },
  ].filter(d => d.value > 0);

  const trendData = data?.recentGroups.map((g: any, idx: number) => ({
    month: `Group ${idx + 1}`,
    value: g._count.expenses * 100,
  })) || [];

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {data && (
          <>
            <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1 sm:mb-2">Welcome back, {user.name}</h2>
                <p className="text-sm sm:text-base text-muted-foreground">Here's your financial overview</p>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => fetchDashboard()}
              >
                <Activity className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 mb-6 sm:mb-8">
              <Card className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent pointer-events-none" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                  <CardTitle className="text-xs sm:text-sm font-medium">You Owe</CardTitle>
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-red-500/10 flex items-center justify-center">
                    <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-xl sm:text-2xl font-bold">₹{data.stats.youOwe.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total amount you owe</p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent pointer-events-none" />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                  <CardTitle className="text-xs sm:text-sm font-medium">You Are Owed</CardTitle>
                  <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className="text-xl sm:text-2xl font-bold">₹{data.stats.youAreOwed.toFixed(2)}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total amount owed to you</p>
                </CardContent>
              </Card>

              <Card className="relative overflow-hidden sm:col-span-2 lg:col-span-1">
                <div className={`absolute inset-0 bg-gradient-to-br from-${data.stats.netBalance >= 0 ? 'green' : 'red'}-500/10 to-transparent pointer-events-none`} />
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
                  <CardTitle className="text-xs sm:text-sm font-medium">Net Balance</CardTitle>
                  <div className={`h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-${data.stats.netBalance >= 0 ? 'green' : 'red'}-500/10 flex items-center justify-center`}>
                    {data.stats.netBalance >= 0 ? <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" /> : <TrendingDown className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />}
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <div className={`text-xl sm:text-2xl font-bold ${data.stats.netBalance >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    ₹{Math.abs(data.stats.netBalance).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{data.stats.netBalance >= 0 ? 'You are owed more' : 'You owe more'}</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-3 mb-6 sm:mb-8">
              {/* Expense Distribution - Lightweight bars */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Expense Distribution
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Expenses by group</p>
                </CardHeader>
                <CardContent>
                  {chartData.length > 0 ? (
                    <div className="space-y-4">
                      {chartData.map((item: any, idx: number) => {
                        const maxExpenses = Math.max(...chartData.map((d: any) => d.expenses));
                        const percentage = (item.expenses / maxExpenses) * 100;
                        return (
                          <div key={idx} className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium truncate">{item.name}</span>
                              <span className="text-muted-foreground">{item.expenses} expenses</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Receipt className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground text-sm">No expense data yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Balance Overview - Simple visual */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Balance Overview
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Your financial balance</p>
                </CardHeader>
                <CardContent>
                  {balanceData.length > 0 ? (
                    <div className="space-y-6">
                      {balanceData.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${item.type === 'You Owe' ? 'bg-red-500' : 'bg-green-500'}`} />
                            <span className="font-medium">{item.type}</span>
                          </div>
                          <span className="text-lg font-bold">₹{item.value.toFixed(2)}</span>
                        </div>
                      ))}
                      <div className="pt-4 border-t">
                        <div className="flex gap-2 h-4 rounded-full overflow-hidden">
                          {balanceData.map((item: any, idx: number) => {
                            const total = balanceData.reduce((sum: number, d: any) => sum + d.value, 0);
                            const percentage = (item.value / total) * 100;
                            return (
                              <div 
                                key={idx}
                                className={`${item.type === 'You Owe' ? 'bg-red-500' : 'bg-green-500'} transition-all`}
                                style={{ width: `${percentage}%` }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <TrendingUp className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground text-sm">No balance data yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Expense Trend - Simple visualization */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">Group expense activity</p>
                </CardHeader>
                <CardContent>
                  {trendData.length > 0 ? (
                    <div className="space-y-3">
                      {trendData.map((item: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between p-3 border rounded-lg hover:border-primary/50 transition">
                          <span className="text-sm font-medium">{item.month}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-muted rounded-full h-2 overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full"
                                style={{ width: `${(item.value / (trendData[0]?.value || 1)) * 100}%` }}
                              />
                            </div>
                            <span className="text-sm text-muted-foreground w-12 text-right">₹{item.value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Activity className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground text-sm">No trend data yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>

            <div className="grid gap-6 md:grid-cols-2 mb-8">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Recent Groups</CardTitle>
                      <p className="text-sm text-muted-foreground">Your active groups</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => router.push('/groups')}>
                      View all
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {data.recentGroups.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8">
                      <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground text-sm text-center">No groups yet</p>
                      <Button size="sm" className="mt-4" onClick={() => router.push('/groups')}>Create Group</Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.recentGroups.map((g: any) => (
                        <div key={g.id} onClick={() => router.push(`/groups/${g.id}`)} className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{g.name}</p>
                              <p className="text-xs text-muted-foreground">{g._count.members} members · {g._count.expenses} expenses</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => router.push('/groups')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Groups</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.stats.totalGroups}</div>
                  <p className="text-xs text-muted-foreground">Manage your groups</p>
                </CardContent>
              </Card>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => router.push('/expenses')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Expenses</CardTitle>
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{data.stats.totalExpenses}</div>
                  <p className="text-xs text-muted-foreground">Add new expense</p>
                </CardContent>
              </Card>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => router.push('/settle')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Settle Up</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{data.stats.totalAmount.toFixed(0)}</div>
                  <p className="text-xs text-muted-foreground">Record payment</p>
                </CardContent>
              </Card>
              <Card className="hover:border-primary/50 transition-colors cursor-pointer" onClick={() => router.push('/activity')}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Activity</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">Recent</div>
                  <p className="text-xs text-muted-foreground">View all activity</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
