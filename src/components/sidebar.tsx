'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Compass, Heart, CreditCard, Settings, Map, Ticket, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Sidebar() {
  const pathname = usePathname();

  const routes = [
    {
      icon: Compass,
      label: 'Dashboard',
      href: '/',
    },
    {
      icon: Map,
      label: 'My Travel',
      href: '/planner',
    },
    {
      icon: Sparkles,
      label: 'AIMarg',
      href: '/ai-marg',
    },
    {
      icon: Ticket,
      label: 'Bookings',
      href: '/bookings',
    },
    {
      icon: Heart,
      label: 'Favorite',
      href: '/favorites',
    },
    {
      icon: CreditCard,
      label: 'Payments',
      href: '/payments',
    },
    {
      icon: Settings,
      label: 'Settings',
      href: '/settings',
    },
  ];

  return (
    <aside className="w-56 bg-white border-r border-gray-200 py-8 px-4 hidden md:flex flex-col">
      {/* Logo */}
      <Link href="/" className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
          <Map className="h-6 w-6 text-white" />
        </div>
        <span className="text-xl font-bold text-gray-900">TripEase</span>
      </Link>

      {/* Navigation */}
      <nav className="space-y-2 flex-1">
        {routes.map((route) => {
          const isActive = pathname === route.href;
          const Icon = route.icon;
          return (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                isActive
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{route.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="pt-4 border-t border-gray-200">
        <Button
          variant="ghost"
          className="w-full justify-start text-gray-600 hover:bg-gray-100"
        >
          <span>Logout</span>
        </Button>
      </div>
    </aside>
  );
}
