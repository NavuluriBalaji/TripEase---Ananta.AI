import { Plane, User } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        <Link href="/" className="flex items-center gap-2 font-bold font-headline mr-6">
          <Plane className="h-6 w-6 text-primary" />
          <span className="text-lg">TripEase</span>
        </Link>
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          <Link href="/destinations" className="transition-colors hover:text-foreground/80 text-foreground/60">Destinations</Link>
          <Link href="/recommendations" className="transition-colors hover:text-foreground/80 text-foreground/60">Recommendations</Link>
          <Link href="/cuisine-finder" className="transition-colors hover:text-foreground/80 text-foreground/60">Cuisine Finder</Link>
          <Link href="/packing-assistant" className="transition-colors hover:text-foreground/80 text-foreground/60">Packing Assistant</Link>
          <Link href="/news" className="transition-colors hover:text-foreground/80 text-foreground/60">News</Link>
          <Link href="/past-trips" className="transition-colors hover:text-foreground/80 text-foreground/60">Past Trips</Link>
        </nav>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="icon" className="rounded-full">
                  <User className="h-5 w-5" />
                  <span className="sr-only">Toggle user menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/profile">Profile</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/past-trips">Past Trips</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem>Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </header>
  );
}
