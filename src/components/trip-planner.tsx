'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { generateItineraryAction } from '@/app/actions';
import { formSchema, ItineraryForm } from './itinerary-form';
import { ItineraryDisplay } from './itinerary-display';
import type { Itinerary, DayPlan } from '@/lib/types';
import { Skeleton } from './ui/skeleton';

function parseItinerary(
  response: { itinerary: string; totalPrice: number },
  id: string
): Itinerary {
  const dailyPlans: DayPlan[] = [];
  const dayBlocks = response.itinerary.split(/Day \d+:/).slice(1);

  dayBlocks.forEach((block, index) => {
    const day = index + 1;
    const costMatch = block.match(/Est\. Cost: \$(\d+(\.\d+)?)/);
    const cost = costMatch ? parseFloat(costMatch[1]) : 0;
    
    let description = block.replace(/Est\. Cost: \$\d+(\.\d+)?/, '').trim();
    if (description.startsWith(':')) {
      description = description.substring(1).trim();
    }
    
    dailyPlans.push({ day, description, cost });
  });

  return { id, dailyPlans, totalPrice: response.totalPrice, originalResponse: response.itinerary };
}

export default function TripPlanner() {
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerateItinerary = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setItinerary(null);
    
    const result = await generateItineraryAction(values);

    if (result.success && result.data) {
      const newItinerary = parseItinerary(result.data, crypto.randomUUID());
      setItinerary(newItinerary);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error || 'An unexpected error occurred.',
      });
    }
    setIsLoading(false);
  };
  
  const handleRefineItinerary = (day: number, refinedSection: string) => {
    setItinerary(prev => {
        if (!prev) return null;
        
        const newDailyPlans = prev.dailyPlans.map(plan => {
            if (plan.day === day) {
                return { ...plan, description: refinedSection };
            }
            return plan;
        });
        
        return { ...prev, dailyPlans: newDailyPlans };
    });
  };

  return (
    <section className="container mx-auto py-12 px-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-1 lg:sticky top-20">
          <ItineraryForm onSubmit={handleGenerateItinerary} isLoading={isLoading} />
        </div>
        <div className="lg:col-span-2">
          {isLoading && <LoadingSkeleton />}
          {itinerary && <ItineraryDisplay itinerary={itinerary} onRefine={handleRefineItinerary} />}
          {!isLoading && !itinerary && (
            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg h-full min-h-[300px]">
                <h3 className="text-xl font-semibold text-muted-foreground">Your adventure awaits</h3>
                <p className="mt-2 text-muted-foreground">Fill in the form to generate your personalized travel itinerary.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function LoadingSkeleton() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-6 w-1/4" />
            </div>
            <div className="space-y-4">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
        </div>
    )
}
