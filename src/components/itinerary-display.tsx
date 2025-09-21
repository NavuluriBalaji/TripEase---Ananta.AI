'use client';

import type { Itinerary, DayPlan } from '@/lib/types';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Landmark, Utensils, BedDouble, Plane, DollarSign } from 'lucide-react';
import { FeedbackForm } from './feedback-form';

type ItineraryDisplayProps = {
  itinerary: Itinerary;
  onRefine: (day: number, refinedSection: string) => void;
};

const iconMap: { [key: string]: React.ElementType } = {
  temple: Landmark,
  shrine: Landmark,
  eat: Utensils,
  food: Utensils,
  restaurant: Utensils,
  hotel: BedDouble,
  ryokan: BedDouble,
  stay: BedDouble,
  flight: Plane,
  airport: Plane,
};

function getIconForActivity(activity: string) {
  const lowerActivity = activity.toLowerCase();
  for (const key in iconMap) {
    if (lowerActivity.includes(key)) {
      return iconMap[key];
    }
  }
  return null;
}

export function ItineraryDisplay({ itinerary, onRefine }: ItineraryDisplayProps) {
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Your Trip Itinerary</span>
          <Badge variant="secondary" className="text-lg">
            Total: ${itinerary.totalPrice.toLocaleString()}
          </Badge>
        </CardTitle>
        <CardDescription>
          Here is your personalized plan. You can refine any day by providing feedback.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full" defaultValue="item-0">
          {itinerary.dailyPlans.map((plan, index) => (
            <AccordionItem value={`item-${index}`} key={plan.day}>
              <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                <div className="flex items-center gap-4">
                  <div className="bg-primary text-primary-foreground rounded-full h-10 w-10 flex items-center justify-center">
                    <CalendarDays className="h-5 w-5" />
                  </div>
                  <span>Day {plan.day}</span>
                  <Badge variant="outline">${plan.cost.toLocaleString()}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pl-14">
                <div className="prose prose-sm max-w-none text-muted-foreground mb-4">
                  {plan.description.split('. ').filter(s => s).map((sentence, i) => {
                      const Icon = getIconForActivity(sentence);
                      return (
                        <div key={i} className="flex items-start gap-3 mb-2">
                           {Icon ? <Icon className="w-4 h-4 mt-1 text-primary"/> : <div className="w-4 h-4 mt-1 shrink-0" />}
                           <p className="m-0">{sentence}.</p>
                        </div>
                      )
                  })}
                </div>
                <FeedbackForm
                  itineraryId={itinerary.id}
                  day={plan.day}
                  onRefine={onRefine}
                />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
