'use client';

import { useState, useEffect } from 'react';
import { Plane, Hotel, Train, Bus, MapPin, Zap } from 'lucide-react';

interface LoadingPhase {
  icon: React.ReactNode;
  label: string;
  message: string;
}

export const TravelBookingLoader = () => {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [dotCount, setDotCount] = useState(0);

  const loadingPhases: LoadingPhase[] = [
    {
      icon: <Plane className="w-12 h-12 text-blue-500" />,
      label: 'Finding Flights',
      message: 'Searching the best flight options for you',
    },
    {
      icon: <Hotel className="w-12 h-12 text-amber-500" />,
      label: 'Checking Hotels',
      message: 'Browsing available accommodations',
    },
    {
      icon: <Train className="w-12 h-12 text-green-500" />,
      label: 'Looking for Trains',
      message: 'Checking rail availability and schedules',
    },
    {
      icon: <Bus className="w-12 h-12 text-purple-500" />,
      label: 'Comparing Buses',
      message: 'Finding comfortable bus routes',
    },
    {
      icon: <MapPin className="w-12 h-12 text-red-500" />,
      label: 'Discovering Activities',
      message: 'Exploring exciting experiences',
    },
    {
      icon: <Zap className="w-12 h-12 text-yellow-500" />,
      label: 'Organizing Results',
      message: 'Putting everything together for you',
    },
  ];

  // Cycle through loading phases
  useEffect(() => {
    const phaseInterval = setInterval(() => {
      setCurrentPhase((prev) => (prev + 1) % loadingPhases.length);
    }, 2000);

    return () => clearInterval(phaseInterval);
  }, [loadingPhases.length]);

  // Animate loading dots
  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDotCount((prev) => (prev + 1) % 4);
    }, 500);

    return () => clearInterval(dotInterval);
  }, []);

  const phase = loadingPhases[currentPhase];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Main loading animation container */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-8">
          {/* Animated plane icon */}
          <div className="flex justify-center">
            <div className="relative w-24 h-24">
              {/* Orbiting icons */}
              <div className="absolute inset-0 animate-spin" style={{ animationDuration: '8s' }}>
                <Hotel className="absolute w-6 h-6 text-amber-400 top-0 left-1/2 transform -translate-x-1/2" />
                <Train className="absolute w-6 h-6 text-green-400 bottom-0 left-1/2 transform -translate-x-1/2" />
                <Bus className="absolute w-6 h-6 text-purple-400 top-1/2 right-0 transform -translate-y-1/2" />
                <MapPin className="absolute w-6 h-6 text-red-400 top-1/2 left-0 transform -translate-y-1/2" />
              </div>

              {/* Center icon with pulse */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-200 rounded-full animate-pulse" />
                  <Plane className="relative w-12 h-12 text-blue-600 animate-bounce" />
                </div>
              </div>
            </div>
          </div>

          {/* Current phase display */}
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl">
                {phase.icon}
              </div>
            </div>

            <div>
              <h3 className="text-2xl font-bold text-gray-800">{phase.label}</h3>
              <p className="text-gray-600 mt-2">{phase.message}</p>
            </div>
          </div>

          {/* Progress indicators */}
          <div className="space-y-4">
            {/* Phase progress dots */}
            <div className="flex justify-center gap-2">
              {loadingPhases.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all duration-500 ${
                    index === currentPhase ? 'w-8 bg-blue-500' : 'w-2 bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {/* Loading bar with gradient */}
            <div className="relative h-1 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full"
                style={{
                  width: `${((currentPhase + 1) / loadingPhases.length) * 100}%`,
                  transition: 'width 2s ease-in-out',
                }}
              />
            </div>
          </div>

          {/* Loading text with animated dots */}
          <div className="text-center">
            <p className="text-gray-600 font-medium">
              Loading your perfect trip
              {'.'.repeat(dotCount)}
              {dotCount < 3 && Array(3 - dotCount).fill('.').join('')}
            </p>
          </div>

          {/* Tips section */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
            <p className="text-sm font-semibold text-blue-900">💡 Travel Tips</p>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>✓ Prices are updated in real-time</li>
              <li>✓ Compare options before booking</li>
              <li>✓ Check cancellation policies</li>
            </ul>
          </div>
        </div>

        {/* Floating decorative elements */}
        <div className="absolute top-10 left-10 w-20 h-20 bg-blue-200 rounded-full opacity-20 animate-blob" />
        <div className="absolute bottom-10 right-10 w-32 h-32 bg-purple-200 rounded-full opacity-20 animate-blob" style={{ animationDelay: '2s' }} />
      </div>

      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
      `}</style>
    </div>
  );
};
