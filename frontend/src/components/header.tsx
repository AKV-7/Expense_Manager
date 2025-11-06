'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getUser, logout } from '@/lib/auth';
import { Button } from './ui/button';
import { ThemeToggle } from './theme-toggle';
import { Home, Users, Activity, Receipt, User, LogOut, ArrowLeft, Calendar } from 'lucide-react';

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUser(getUser());
  }, []);

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  const navigateTo = (path: string) => {
    router.push(path);
  };

  const isActive = (path: string) => {
    return pathname === path;
  };

  // Check if we're on a group detail page
  const isGroupDetailPage = pathname?.startsWith('/groups/') && pathname !== '/groups' && pathname !== '/groups/archived' && pathname !== '/groups/create';
  
  // Check if we're on receipts page
  const isReceiptsPage = pathname === '/receipts';
  
  // Check if we're on activity page
  const isActivityPage = pathname === '/activity';
  
  // Check if we're on create group page
  const isCreateGroupPage = pathname === '/groups/create';
  
  // Check if we're on groups page
  const isGroupsPage = pathname === '/groups';

  // Prevent hydration mismatch by not rendering user-specific content until mounted
  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 flex h-14 sm:h-16 items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
            <h1 className="text-base sm:text-lg md:text-2xl font-bold bg-gradient-to-r from-primary via-cyan-400 to-primary bg-clip-text text-transparent cursor-pointer">
              QUIPO
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </div>
      </header>
    );
  }

  return (
    <>
      {/* Top Header - Desktop and Mobile */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className={`max-w-7xl mx-auto px-3 sm:px-4 md:px-6 flex items-center justify-between ${
          isGroupDetailPage ? 'h-12 sm:h-16' : 'h-14 sm:h-16'
        }`}>
          <div className="flex items-center gap-2 sm:gap-4 md:gap-6">
            {/* Back button for group detail pages on mobile */}
            {isGroupDetailPage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/groups')}
                className="md:hidden -ml-2 h-9"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            
            {/* Back button for receipts page on mobile */}
            {isReceiptsPage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="md:hidden -ml-2 h-9"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            
            {/* Receipts heading on mobile */}
            {isReceiptsPage && (
              <h1 className="md:hidden text-lg font-bold">Receipts</h1>
            )}
            
            {/* Back button for activity page on mobile */}
            {isActivityPage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/dashboard')}
                className="md:hidden -ml-2 h-9"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            
            {/* Activity heading on mobile */}
            {isActivityPage && (
              <h1 className="md:hidden text-lg font-bold">Activity</h1>
            )}
            
            {/* Back button for create group page on mobile */}
            {isCreateGroupPage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/groups')}
                className="md:hidden -ml-2 h-9"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            )}
            
            {/* Create Group heading on mobile */}
            {isCreateGroupPage && (
              <h1 className="md:hidden text-lg font-bold">Create Group</h1>
            )}
            
            {/* Your Groups heading on mobile */}
            {isGroupsPage && (
              <h1 className="md:hidden text-lg font-bold">Your Groups</h1>
            )}
            
            {/* Logo - hidden on mobile for group detail pages, groups page, receipts page, activity page, and create group page */}
            <h1 
              onClick={() => navigateTo('/dashboard')}
              className={`text-base sm:text-lg md:text-2xl font-bold bg-gradient-to-r from-primary via-cyan-400 to-primary bg-clip-text text-transparent cursor-pointer ${
                isGroupDetailPage || pathname === '/groups' || isReceiptsPage || isActivityPage || isCreateGroupPage ? 'hidden md:block' : ''
              }`}
            >
              QUIPO
            </h1>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-1">
              <Button 
                variant={isActive('/dashboard') ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => navigateTo('/dashboard')}
              >
                <Home className="h-4 w-4 mr-2" />
                Dashboard
              </Button>
              <Button 
                variant={isActive('/groups') ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => navigateTo('/groups')}
              >
                <Users className="h-4 w-4 mr-2" />
                Groups
              </Button>
              <Button 
                variant={isActive('/calendar') ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => navigateTo('/calendar')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Calendar
              </Button>
              <Button 
                variant={isActive('/activity') ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => navigateTo('/activity')}
              >
                <Activity className="h-4 w-4 mr-2" />
                Activity
              </Button>
              <Button 
                variant={isActive('/receipts') ? 'default' : 'ghost'} 
                size="sm" 
                onClick={() => navigateTo('/receipts')}
              >
                <Receipt className="h-4 w-4 mr-2" />
                Receipts
              </Button>
            </nav>
          </div>
          
          <div className="flex items-center gap-1 sm:gap-2">
            <ThemeToggle />
            {user && (
              <div className="hidden md:flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigateTo('/profile')}
                >
                  <User className="h-4 w-4 mr-2" />
                  {user.name}
                </Button>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Bottom Navigation Bar - Mobile Only */}
      {user && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 border-t">
          <div className="grid grid-cols-5 h-16">
            <button
              onClick={() => navigateTo('/dashboard')}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive('/dashboard')
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Home className="h-5 w-5" />
              <span className="text-xs font-medium">Home</span>
            </button>

            <button
              onClick={() => navigateTo('/groups')}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive('/groups') || pathname?.startsWith('/groups/')
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="h-5 w-5" />
              <span className="text-xs font-medium">Groups</span>
            </button>

            <button
              onClick={() => navigateTo('/calendar')}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive('/calendar')
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Calendar className="h-5 w-5" />
              <span className="text-xs font-medium">Calendar</span>
            </button>

            <button
              onClick={() => navigateTo('/receipts')}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive('/receipts')
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Receipt className="h-5 w-5" />
              <span className="text-xs font-medium">Receipts</span>
            </button>

            <button
              onClick={() => navigateTo('/profile')}
              className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                isActive('/profile')
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <User className="h-5 w-5" />
              <span className="text-xs font-medium">Profile</span>
            </button>
          </div>
        </nav>
      )}
    </>
  );
}
