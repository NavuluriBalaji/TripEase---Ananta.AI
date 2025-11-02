"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/hooks/use-auth';

export default function LandingPage() {
  const router = useRouter();
  const { currentUser, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    const id = setTimeout(() => {
      if (currentUser) {
        router.replace('/planner');
      } else {
        router.replace('/login');
      }
    }, 1000);
    return () => clearTimeout(id);
  }, [router, currentUser, loading]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center px-6 py-16">
      <div className="max-w-4xl mx-auto text-center">
        <div className="relative w-24 h-24 mx-auto mb-6">
          <Image
            src="/favicon.ico"
            alt="TripEase"
            fill
            className="rounded-lg object-contain"
            priority
          />
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 mb-3">
          Welcome to TripEase
        </h1>
        <p className="text-gray-600 text-lg mb-8">
          Your AI copilot for smarter travel. Redirecting to sign in…
        </p>
        <div className="inline-flex items-center gap-2 text-blue-700 font-medium">
          <span className="h-2 w-2 bg-blue-600 rounded-full animate-pulse" />
          <span>Getting things ready</span>
        </div>
      </div>
    </div>
  );
}
