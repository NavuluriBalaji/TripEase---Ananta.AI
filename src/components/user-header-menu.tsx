'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LogOut, Settings, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { signOut } from '@/lib/auth-utils';

export function UserHeaderMenu() {
  const router = useRouter();
  const { currentUser, userProfile, loading } = useAuth();

  // Show loading state
  if (loading) {
    return (
      <Button variant="ghost" disabled className="flex items-center gap-3 hover:bg-gray-100">
        <div className="w-8 h-8 bg-gray-300 rounded-full animate-pulse" />
      </Button>
    );
  }

  // Show login link if not authenticated
  if (!currentUser) {
    return (
      <div className="flex items-center gap-2">
        <Link href="/login">
          <Button variant="secondary" className="border-gray-300 text-gray-900 hover:bg-gray-100">
            Sign In
          </Button>
        </Link>
        <Link href="/signup">
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            Sign Up
          </Button>
        </Link>
      </div>
    );
  }

  // Show user profile if authenticated
  const displayName = userProfile?.displayName || currentUser.displayName || 'User';
  const email = currentUser.email || '';
  const photoURL = userProfile?.photoURL || currentUser.photoURL;
  
  // Generate initials from display name
  const initials = displayName
    .split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-3 hover:bg-gray-100 h-auto py-2 px-3">
          <div className="flex flex-col items-end text-sm">
            <span className="font-medium text-gray-900">{displayName}</span>
            <span className="text-xs text-gray-500">Traveler</span>
          </div>
          {photoURL ? (
            <img
              src={photoURL}
              alt={displayName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {initials}
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="font-medium text-gray-900">{displayName}</span>
          <span className="text-xs text-gray-500 font-normal">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
            <UserIcon className="h-4 w-4" />
            <span>Profile</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center gap-2 cursor-pointer">
            <Settings className="h-4 w-4" />
            <span>Settings</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="flex items-center gap-2 text-red-600 cursor-pointer"
        >
          <LogOut className="h-4 w-4" />
          <span>Logout</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
