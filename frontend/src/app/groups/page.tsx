'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Header } from '@/components/header';
import { Users, Receipt, Archive, Plus, ChevronRight, LayoutGrid, List } from 'lucide-react';

export default function GroupsPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('friends');
  const [viewMode, setViewMode] = useState<'card' | 'list'>('list');
  const [showAddMembersPrompt, setShowAddMembersPrompt] = useState(false);
  const [newGroupId, setNewGroupId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!getUser()) {
      router.push('/login');
      return;
    }
    fetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Remove router from dependencies to prevent infinite loop

  const fetchGroups = async () => {
    try {
      const { data } = await api.get('/groups');
      setGroups(data.data.groups);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const createGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/groups', { name, description, category });
      const createdGroupId = response.data.data.group.id;
      
      setShowModal(false);
      setName('');
      setDescription('');
      fetchGroups();
      
      // Show add members prompt
      setNewGroupId(createdGroupId);
      setShowAddMembersPrompt(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddMembersNow = () => {
    setShowAddMembersPrompt(false);
    if (newGroupId) {
      router.push(`/groups/${newGroupId}`);
    }
  };

  const handleAddMembersLater = () => {
    setShowAddMembersPrompt(false);
    setNewGroupId(null);
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto mb-3"></div>
        <p className="text-sm text-muted-foreground">Loading groups...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <Header />

      <main className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
        {/* Page Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <div className="flex flex-col gap-3 sm:gap-4">
            {/* Mobile: View Toggle and Archived Button */}
            <div className="flex md:hidden items-center justify-between">
              {/* View Toggle */}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                <Button
                  variant={viewMode === 'card' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('card')}
                  className="h-8 w-8 p-0"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                  className="h-8 w-8 p-0"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              {/* Archived Button */}
              <Button 
                variant="outline" 
                onClick={() => router.push('/groups/archived')}
                size="sm"
                className="h-9 px-3 gap-2"
              >
                <Archive className="h-4 w-4" />
                <span>Archived</span>
              </Button>
            </div>

            {/* Desktop: Heading and Actions */}
            <div className="hidden md:flex items-center justify-between">
              <div>
                <h2 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight">Your Groups</h2>
                <p className="text-xs sm:text-sm md:text-base text-muted-foreground mt-0.5 sm:mt-1">
                  Manage shared expenses
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                  <Button
                    variant={viewMode === 'card' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('card')}
                    className="h-8 w-8 p-0"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="h-8 w-8 p-0"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
                <Button 
                  variant="outline" 
                  onClick={() => router.push('/groups/archived')}
                  size="sm"
                  className="h-9 px-3"
                >
                  <Archive className="h-4 w-4" />
                  <span className="ml-2">Archived</span>
                </Button>
              </div>
            </div>

            <Button 
              onClick={() => setShowModal(true)} 
              size="lg"
              className="hidden md:flex w-full h-12 text-base font-semibold shadow-lg hover:shadow-xl transition-shadow"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create New Group
            </Button>
          </div>
        </div>

        {/* Groups Grid */}
        {groups.length === 0 ? (
          <Card className="relative overflow-hidden border-dashed">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent" />
            <CardContent className="relative p-8 sm:p-12 text-center">
              <div className="max-w-sm mx-auto">
                <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold mb-2">No groups yet</h3>
                <p className="text-sm sm:text-base text-muted-foreground mb-6">
                  Create your first group to start tracking shared expenses with friends and family
                </p>
                <Button onClick={() => setShowModal(true)} size="lg" className="w-full sm:w-auto">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Group
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Card View */}
            {viewMode === 'card' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                {groups.map((group) => (
                  <Card
                    key={group.id}
                    onClick={() => router.push(`/groups/${group.id}`)}
                    className="cursor-pointer hover:border-primary transition-all hover:shadow-lg active:scale-[0.98] relative overflow-hidden group"
                  >
                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <CardHeader className="pb-3 relative">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base sm:text-lg font-bold line-clamp-1 mb-1">
                            {group.name}
                          </CardTitle>
                          <span className="inline-flex items-center px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full capitalize font-medium">
                            {group.category}
                          </span>
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                      </div>
                    </CardHeader>
                    
                    <CardContent className="pt-0 relative">
                      <p className="text-xs sm:text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[2.5rem]">
                        {group.description || 'No description'}
                      </p>
                      
                      {/* Stats */}
                      <div className="flex items-center gap-4 pt-3 border-t">
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Users className="h-4 w-4 text-blue-500" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs text-muted-foreground">Members</span>
                            <span className="text-sm font-bold">{group.members.length}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 flex-1">
                          <div className="w-8 h-8 bg-green-500/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Receipt className="h-4 w-4 text-green-500" />
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="text-xs text-muted-foreground">Expenses</span>
                            <span className="text-sm font-bold">{group._count.expenses}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="space-y-2">
                {groups.map((group) => (
                  <Card
                    key={group.id}
                    onClick={() => router.push(`/groups/${group.id}`)}
                    className="cursor-pointer hover:border-primary transition-all hover:shadow-md active:scale-[0.99] relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    
                    <CardContent className="p-4 relative">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="text-base sm:text-lg font-bold truncate">{group.name}</h3>
                            <span className="inline-flex items-center px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full capitalize font-medium flex-shrink-0">
                              {group.category}
                            </span>
                          </div>
                          <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                            {group.description || 'No description'}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-blue-500" />
                            <span className="text-sm font-semibold">{group.members.length}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Receipt className="h-4 w-4 text-green-500" />
                            <span className="text-sm font-semibold">{group._count.expenses}</span>
                          </div>
                          
                          <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Create Group Dialog */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="sm:max-w-[425px] max-w-[calc(100vw-2rem)] mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl">Create New Group</DialogTitle>
          </DialogHeader>
          <form onSubmit={createGroup} className="space-y-4 sm:space-y-5">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Group Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Weekend Trip, Roommates"
                required
                className="h-11"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this group for?"
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category" className="text-sm font-medium">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-11">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="friends">👥 Friends</SelectItem>
                  <SelectItem value="trip">✈️ Trip</SelectItem>
                  <SelectItem value="home">🏠 Home</SelectItem>
                  <SelectItem value="couple">💑 Couple</SelectItem>
                  <SelectItem value="roommates">🚪 Roommates</SelectItem>
                  <SelectItem value="project">💼 Project</SelectItem>
                  <SelectItem value="event">🎉 Event</SelectItem>
                  <SelectItem value="other">📌 Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => setShowModal(false)} 
                className="flex-1 h-11"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                className="flex-1 h-11 font-semibold"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Members Prompt Dialog */}
      <Dialog open={showAddMembersPrompt} onOpenChange={setShowAddMembersPrompt}>
        <DialogContent className="sm:max-w-[425px] max-w-[calc(100vw-2rem)] mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl sm:text-2xl">Group Created! 🎉</DialogTitle>
            <DialogDescription className="text-sm sm:text-base mt-2">
              Your group has been created successfully. Would you like to add members now?
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 pt-4">
            <Button 
              onClick={handleAddMembersNow}
              size="lg"
              className="w-full h-11 font-semibold"
            >
              <Users className="h-4 w-4 mr-2" />
              Add Members Now
            </Button>
            <Button 
              onClick={handleAddMembersLater}
              variant="outline"
              size="lg"
              className="w-full h-11"
            >
              Add Members Later
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* FAB for mobile - Create Group */}
      <Button
        onClick={() => router.push('/groups/create')}
        size="lg"
        className="md:hidden fixed bottom-20 right-4 z-40 h-14 px-6 rounded-full shadow-lg hover:shadow-xl gap-2"
      >
        <Plus className="h-5 w-5" />
        <span className="font-semibold">Create Group</span>
      </Button>
    </div>
  );
}
