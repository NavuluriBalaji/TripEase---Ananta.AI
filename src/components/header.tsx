"use client";

import { Bell, Search, Menu, Compass, Heart, CreditCard, Settings, Map, Ticket, Newspaper, Briefcase } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { UserHeaderMenu } from '@/components/user-header-menu';
import { cn } from '@/lib/utils';

export default function Header() {
  const pathname = usePathname();

  const routes = [
    { icon: Compass, label: 'Dashboard', href: '/' },
    { icon: Map, label: 'TripEase AI Planner', href: '/planner' },
    { icon: Ticket, label: 'Bookings', href: '/bookings' },
    { icon: Heart, label: 'Favorite', href: '/favorites' },
    { icon: CreditCard, label: 'Payments', href: '/payments' },
    { icon: Settings, label: 'Settings', href: '/settings' },
  ];

  const otherRoutes = [
    { icon: Newspaper, label: 'News', href: '/news' },
    { icon: Briefcase, label: 'Packing Assistant', href: '/packing-assistant' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200 bg-white">
      <div className="flex h-16 items-center justify-between px-4 md:px-8">
        {/* Mobile: Hamburger + Brand */}
        <div className="flex items-center gap-3 md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-gray-700">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-3/4 sm:max-w-sm">
              {/* Accessibility title for Dialog (screen-reader only) */}
              <SheetHeader className="sr-only">
                <SheetTitle>Navigation menu</SheetTitle>
              </SheetHeader>
              <div className="flex items-center gap-3 p-4 border-b">
                <div className="w-8 h-8 rounded-lg overflow-hidden ring-1 ring-black/5">
                  <Image src="/icon.svg" alt="TripEase" width={32} height={32} />
                </div>
                <span className="text-base font-semibold text-gray-900">TripEase</span>
              </div>
              <nav className="p-2">
                {routes.map((route) => {
                  const isActive = pathname === route.href;
                  const Icon = route.icon;
                  return (
                    <Link
                      key={route.href}
                      href={route.href}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                        isActive ? 'bg-blue-900 text-white' : 'text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{route.label}</span>
                    </Link>
                  );
                })}
                <div className="px-4 pt-4 pb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
                  Other
                </div>
                {otherRoutes.map((route) => {
                  const isActive = pathname === route.href;
                  const Icon = route.icon;
                  return (
                    <Link
                      key={route.href}
                      href={route.href}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                        isActive ? 'bg-blue-900 text-white' : 'text-gray-700 hover:bg-gray-100'
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span>{route.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden ring-1 ring-black/5">
              <Image src="/icon.svg" alt="TripEase" width={32} height={32} />
            </div>
            <span className="text-base font-semibold text-gray-900">TripEase</span>
          </Link>
        </div>

        {/* Search Bar (Desktop) */}
        <div className="hidden md:block flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search your destination"
              className="pl-10 bg-gray-50 border-gray-200 text-sm"
            />
          </div>
        </div>

        {/* Right side: Notification and User */}
        <div className="flex items-center gap-4 md:gap-6 ml-auto">
          {/* Notification Bell */}
          <Button
            variant="ghost"
            size="icon"
            className="relative text-gray-600 hover:bg-gray-100"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
          </Button>

          {/* User Menu */}
          <UserHeaderMenu />
        </div>
      </div>
    </header>
  );
}
