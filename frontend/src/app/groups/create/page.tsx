'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Header } from '@/components/header';
import { Plus, Users, Search, X, UserPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useNotification } from '@/contexts/notification-context';

export default function CreateGroupPage() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('friends');
  const [creating, setCreating] = useState(false);
  
  // Member search states
  const [searchEmail, setSearchEmail] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState<any[]>([]);
  
  const router = useRouter();
  const { showSuccess, showError } = useNotification();

  const handleSearchUser = async () => {
    if (!searchEmail.trim()) return;

    setSearching(true);
    try {
      const { data } = await api.get(`/user/search?q=${encodeURIComponent(searchEmail)}`);
      setSearchResults(data.data.users || []);
      if (data.data.users.length === 0) {
        showError('No users found', `No user found with email: ${searchEmail}`);
      }
    } catch (err: any) {
      showError('Search failed', err.response?.data?.error?.message || 'Failed to search users');
    } finally {
      setSearching(false);
    }
  };

  const handleAddMember = (user: any) => {
    if (!selectedMembers.find(m => m.id === user.id)) {
      setSelectedMembers([...selectedMembers, user]);
      setSearchEmail('');
      setSearchResults([]);
    }
  };

  const handleRemoveMember = (userId: string) => {
    setSelectedMembers(selectedMembers.filter(m => m.id !== userId));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setCreating(true);
    try {
      const response = await api.post('/groups', { name, description, category });
      console.log('Group created response:', response.data);
      const createdGroupId = response.data.data.id; // Fixed: data.id instead of data.group.id

      // Add selected members to the group
      if (selectedMembers.length > 0) {
        console.log('Adding members to group:', createdGroupId, selectedMembers);
        
        for (const member of selectedMembers) {
          try {
            console.log('Adding member:', member.email);
            const addMemberResponse = await api.post(`/groups/${createdGroupId}/members`, {
              email: member.email
            });
            console.log('Member added successfully:', addMemberResponse.data);
          } catch (err: any) {
            console.error('Failed to add member:', member.email, err.response?.data || err);
            showError('Failed to add member', `Could not add ${member.email}: ${err.response?.data?.error?.message || 'Unknown error'}`);
          }
        }
      }

      showSuccess('Group created!', 'Your group has been created successfully');
      router.push('/groups');
    } catch (err: any) {
      console.error('Failed to create group:', err.response?.data || err);
      showError('Failed to create group', err.response?.data?.error?.message || 'An error occurred');
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />
      
      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Create New Group</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Set up a new group to track shared expenses
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Group Details Card */}
          <Card>
            <CardContent className="pt-6 space-y-4">
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
                  placeholder="What is this group for?"
                  className="min-h-[80px] resize-none"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category" className="text-sm font-medium">Category *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-11">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="friends">Friends</SelectItem>
                    <SelectItem value="trip">Trip</SelectItem>
                    <SelectItem value="home">Home</SelectItem>
                    <SelectItem value="couple">Couple</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Add Members Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5" />
                Add Members (Optional)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Input */}
              <div className="space-y-2">
                <Label htmlFor="search" className="text-sm font-medium">Search by Email</Label>
                <div className="flex gap-2">
                  <Input
                    id="search"
                    type="email"
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchUser())}
                    placeholder="Enter email address"
                    className="h-10"
                  />
                  <Button
                    type="button"
                    onClick={handleSearchUser}
                    disabled={searching || !searchEmail.trim()}
                    size="sm"
                    className="h-10 px-4"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="space-y-2">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-3 rounded-lg border bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback className="text-sm">
                            {user.name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-sm">{user.name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => handleAddMember(user)}
                        disabled={selectedMembers.some(m => m.id === user.id)}
                      >
                        <UserPlus className="h-4 w-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Selected Members */}
              {selectedMembers.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    Selected Members ({selectedMembers.length})
                  </Label>
                  <div className="space-y-2">
                    {selectedMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 rounded-lg border bg-primary/5"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="text-sm">
                              {member.name?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm">{member.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveMember(member.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => router.back()}
              className="flex-1 h-12"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={creating || !name}
              className="flex-1 h-12 font-semibold"
            >
              {creating ? 'Creating...' : 'Create Group'}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}
