import Header from '@/components/header';

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1">{children}</main>
      <footer className="py-6 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} TripEase. All rights reserved.
      </footer>
    </div>
  );
}
