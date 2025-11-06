'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/header';
import { Archive, Users, Receipt, ArrowLeft, ArchiveRestore } from 'lucide-react';
import { useNotification } from '@/contexts/notification-context';

export default function ArchivedGroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [unarchiving, setUnarchiving] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    setMounted(true);
    const userData = getUser();
    setUser(userData);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    if (!user) {
      router.push('/login');
      return;
    }
    
    fetchArchivedGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const fetchArchivedGroups = async () => {
    try {
      const { data } = await api.get('/groups/archived');
      console.log('Archived groups response:', data);
      setGroups(data.data?.groups || []);
    } catch (err: any) {
      console.error('Fetch archived groups error:', err);
      console.error('Error response:', err.response);
      
      // Don't redirect to login on error, just show the error
      if (err.response?.status === 401) {
        showError('Authentication Error', 'Please login again');
        router.push('/login');
      } else {
        showError('Error', err.response?.data?.error?.message || 'Failed to fetch archived groups');
        // Set empty array so page doesn't break
        setGroups([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUnarchive = async (groupId: string, groupName: string) => {
    if (!confirm(`Restore "${groupName}" back to active groups?`)) {
      return;
    }

    setUnarchiving(groupId);
    try {
      await api.post(`/groups/${groupId}/unarchive`);
      showSuccess('Group Restored', 'Group has been moved back to active groups');
      // Remove from list
      setGroups(groups.filter(g => g.id !== groupId));
    } catch (err: any) {
      console.error('Unarchive error:', err);
      const errorMessage = err.response?.data?.error?.message || 'Failed to restore group';
      showError('Restore Failed', errorMessage);
    } finally {
      setUnarchiving(null);
    }
  };

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    // Delay redirect to avoid flash
    if (mounted) {
      setTimeout(() => router.push('/login'), 100);
    }
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <Header />
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Button 
              variant="ghost" 
              onClick={() => router.push('/groups')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Groups
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-500/10 rounded-lg">
              <Archive className="h-8 w-8 text-orange-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Archived Groups</h1>
              <p className="text-muted-foreground">
                {groups.length === 0 
                  ? 'No archived groups' 
                  : `${groups.length} archived ${groups.length === 1 ? 'group' : 'groups'}`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Groups Grid */}
        {groups.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Archive className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No Archived Groups</h3>
              <p className="text-muted-foreground mb-4">
                Groups you archive will appear here. Archiving hides groups without deleting any data.
              </p>
              <Button onClick={() => router.push('/groups')}>
                View Active Groups
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {groups.map((group) => (
              <Card 
                key={group.id} 
                className="relative overflow-hidden hover:border-primary/50 transition cursor-pointer group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent pointer-events-none" />
                
                <CardHeader className="relative z-10">
                  <div className="flex items-start justify-between mb-2">
                    <CardTitle className="text-xl line-clamp-1">{group.name}</CardTitle>
                    <div className="px-2 py-1 bg-orange-500/10 rounded text-xs font-medium text-orange-600 flex items-center gap-1">
                      <Archive className="h-3 w-3" />
                      Archived
                    </div>
                  </div>
                  {group.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {group.description}
                    </p>
                  )}
                </CardHeader>

                <CardContent className="relative z-10">
                  <div className="space-y-3">
                    {/* Stats */}
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        <span>{group.members.length}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Receipt className="h-4 w-4" />
                        <span>{group._count.expenses}</span>
                      </div>
                      <div className="px-2 py-0.5 bg-primary/10 rounded text-xs capitalize">
                        {group.category}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => router.push(`/groups/${group.id}`)}
                      >
                        View Details
                      </Button>
                      {user.id === group.createdBy && (
                        <Button
                          variant="default"
                          size="sm"
                          className="flex-1 bg-orange-600 hover:bg-orange-700"
                          onClick={() => handleUnarchive(group.id, group.name)}
                          disabled={unarchiving === group.id}
                        >
                          <ArchiveRestore className="h-4 w-4 mr-2" />
                          {unarchiving === group.id ? 'Restoring...' : 'Restore'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
