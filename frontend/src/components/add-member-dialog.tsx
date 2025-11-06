'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import api from '@/lib/api';
import { useNotification } from '@/contexts/notification-context';

interface AddMemberDialogProps {
  groupId: string;
  onMemberAdded: () => void;
  allUsers?: Array<{ id: string; name: string; email: string }>;
}

export default function AddMemberDialog({ groupId, onMemberAdded, allUsers = [] }: AddMemberDialogProps) {
  const { showSuccess, showError, showInfo } = useNotification();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Array<{ id: string; name: string; email: string }>>([]);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      // Search users by email or name
      const { data } = await api.get(`/user/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(data.data.users || []);
      
      if (data.data.users.length === 0) {
        setError('No users found. They need to register first.');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Failed to search users');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUser) {
      setError('Please select a user to add');
      showError('Validation Error', 'Please select a user to add');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      await api.post(`/groups/${groupId}/members`, {
        userId: selectedUser
      });

      const addedUser = searchResults.find(u => u.id === selectedUser);
      showSuccess(
        'Member Added',
        `${addedUser?.name || 'User'} has been added to the group`
      );
      setSuccess('Member added successfully!');
      setSelectedUser('');
      setSearchQuery('');
      setSearchResults([]);
      
      setTimeout(() => {
        setSuccess('');
        setOpen(false);
        onMemberAdded();
      }, 1500);
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Failed to add member';
      
      if (errorMessage.includes('already in group')) {
        setError('This user is already a member of this group');
        showInfo('Already a Member', 'This user is already in the group');
      } else if (errorMessage.includes('not found')) {
        setError('User not found. Ask them to register first.');
        showError('User Not Found', 'This user needs to register first');
      } else {
        setError(errorMessage);
        showError('Error', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const resetDialog = () => {
    setSearchQuery('');
    setSelectedUser('');
    setError('');
    setSuccess('');
    setSearchResults([]);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetDialog();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full" data-add-member-trigger>
          <span className="mr-2">👥</span> Add Member
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Add Member to Group</DialogTitle>
          <DialogDescription>
            Search for a user by their email address or name. They must be registered on the platform.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Search Input */}
          <div className="space-y-2">
            <Label htmlFor="search">Search User</Label>
            <div className="flex gap-2">
              <Input
                id="search"
                placeholder="Enter email or name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                disabled={loading}
              />
              <Button 
                onClick={handleSearch} 
                disabled={loading || !searchQuery.trim()}
                variant="secondary"
              >
                {loading ? '🔍 Searching...' : '🔍 Search'}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              💡 Tip: Enter full email address (e.g., john@example.com) or name
            </p>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <Label>Search Results (Select one)</Label>
              <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-lg p-2">
                {searchResults.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedUser === user.id
                        ? 'bg-primary/10 border-primary shadow-sm'
                        : 'bg-muted/30 hover:bg-muted/50 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      {selectedUser === user.id && (
                        <div className="text-primary">
                          ✓
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Add from All Users (if provided) */}
          {allUsers.length > 0 && searchResults.length === 0 && !searchQuery && (
            <div className="space-y-2">
              <Label>Or select from recent users</Label>
              <div className="max-h-[200px] overflow-y-auto space-y-2 border rounded-lg p-2">
                {allUsers.slice(0, 5).map((user) => (
                  <div
                    key={user.id}
                    onClick={() => setSelectedUser(user.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedUser === user.id
                        ? 'bg-primary/10 border-primary shadow-sm'
                        : 'bg-muted/30 hover:bg-muted/50 border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center font-bold text-primary">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      {selectedUser === user.id && (
                        <div className="text-primary">
                          ✓
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-lg text-sm">
              ⚠️ {error}
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-3 bg-green-500/10 border border-green-500/20 text-green-500 rounded-lg text-sm">
              ✅ {success}
            </div>
          )}

          {/* Help Text */}
          {!searchQuery && searchResults.length === 0 && (
            <div className="p-4 bg-muted/30 rounded-lg border border-dashed">
              <p className="text-sm text-muted-foreground">
                <strong>How to add members:</strong>
              </p>
              <ol className="text-sm text-muted-foreground mt-2 space-y-1 ml-4 list-decimal">
                <li>Enter their email address or name in the search box</li>
                <li>Click the Search button</li>
                <li>Select the user from the results</li>
                <li>Click "Add Member" button</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-3">
                📧 <strong>Note:</strong> Users must have an account to be added. Ask them to register first!
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => {
              resetDialog();
              setOpen(false);
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddMember} 
            disabled={loading || !selectedUser || !!success}
          >
            {loading ? '⏳ Adding...' : '✓ Add Member'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
