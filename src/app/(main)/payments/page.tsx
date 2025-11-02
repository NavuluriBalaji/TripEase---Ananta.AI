"use client";

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, CheckCircle2, XCircle, Clock } from 'lucide-react';

type MockPayment = {
  id: string;
  date: string; // ISO date string
  category: 'flight' | 'hotel' | 'car';
  description: string;
  amountUsd: number;
  status: 'succeeded' | 'failed' | 'pending';
};

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function sample<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeRandomPayment(i: number): MockPayment {
  const categories: MockPayment['category'][] = ['flight', 'hotel', 'car'];
  const hotels = ['The Grand Meridian', 'Oceanview Resort', 'City Central Inn', 'Mountain Peak Lodge'];
  const flights = ['DEL → GOI (IndiGo)', 'SFO → LAX (United)', 'NYC → MIA (Delta)', 'PAR → ROM (Alitalia)'];
  const cars = ['Sedan (Toyota Camry)', 'SUV (Hyundai Creta)', 'Hatchback (Maruti Baleno)', 'Luxury (BMW 5)'];
  const statuses: MockPayment['status'][] = ['succeeded', 'pending', 'failed'];

  const category = sample(categories);
  const description = category === 'hotel' ? sample(hotels)
                    : category === 'flight' ? sample(flights)
                    : sample(cars);
  const base = category === 'hotel' ? 120 : category === 'flight' ? 220 : 60;
  const amountUsd = base + randomInt(0, 180);
  const d = new Date();
  d.setDate(d.getDate() - randomInt(0, 28));
  const status = sample(statuses);
  return {
    id: `pay_${(Math.random().toString(36) + i.toString(36)).slice(2, 10)}`,
    date: d.toISOString(),
    category,
    description,
    amountUsd,
    status,
  };
}

function formatUsd(n: number) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR' }).format(n);
  } catch {
    return `₹${n.toFixed(2)}`;
  }
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<MockPayment[] | null>(null);

  useEffect(() => {
    // Generate 5 random mock payments on mount
    const list = Array.from({ length: 5 }).map((_, i) => makeRandomPayment(i));
    // Shuffle
    list.sort(() => Math.random() - 0.5);
    setPayments(list);
  }, []);

  return (
    <div className="flex-1 overflow-auto bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Payments</h1>
        <p className="text-gray-600 mb-8">Manage your bookings and payment history</p>

        {!payments && (
          <Card className="bg-white border-gray-200">
            <CardContent className="p-12 text-center">
              <CreditCard className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Loading payments…</h3>
              <p className="text-gray-600">Please wait</p>
            </CardContent>
          </Card>
        )}

        {payments && (
          <div className="grid grid-cols-1 gap-4">
            {payments.map((p) => {
              const d = new Date(p.date);
              const dateStr = d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
              const StatusIcon = p.status === 'succeeded' ? CheckCircle2 : p.status === 'failed' ? XCircle : Clock;
              const statusClass = p.status === 'succeeded'
                ? 'text-green-600'
                : p.status === 'failed'
                ? 'text-red-600'
                : 'text-amber-600';
              return (
                <Card key={p.id} className="bg-white border-gray-200">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-base font-semibold">{p.category.toUpperCase()}</CardTitle>
                    <span className="text-sm text-gray-500">{dateStr}</span>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <div>
                      <div className="text-sm text-gray-900">{p.description}</div>
                      <div className="text-xs text-gray-500 mt-1">Payment ID: {p.id}</div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        <div className="text-lg font-semibold text-gray-900">{formatUsd(p.amountUsd)}</div>
                        <div className={`flex items-center gap-1 text-xs font-medium ${statusClass}`}>
                          <StatusIcon className="h-4 w-4" />
                          <span className="capitalize">{p.status}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
