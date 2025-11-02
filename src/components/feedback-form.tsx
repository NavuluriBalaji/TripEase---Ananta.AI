'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { refineItineraryAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from './ui/form';
import { Wand2 } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

type FeedbackFormProps = {
  itineraryId: string;
  day: number;
  onRefine: (day: number, refinedSection: string) => void;
};

const feedbackSchema = z.object({
  feedback: z.string().min(10, 'Please provide at least 10 characters of feedback.'),
});

export function FeedbackForm({ itineraryId, day, onRefine }: FeedbackFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const form = useForm<z.infer<typeof feedbackSchema>>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: { feedback: '' },
  });

  const handleSubmit = async (values: z.infer<typeof feedbackSchema>) => {
    setIsLoading(true);
    const result = await refineItineraryAction({
      itineraryId,
      feedback: values.feedback,
      sectionToRefine: `Day ${day}`,
    });

    if (result.success && result.data) {
      onRefine(day, result.data.refinedItinerarySection);
      toast({
        title: 'Day Refined!',
        description: `Day ${day} has been updated with your feedback.`,
      });
      form.reset();
      setIsOpen(false);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error || 'Failed to refine the itinerary.',
      });
    }
    setIsLoading(false);
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm">
          <Wand2 className="h-4 w-4 mr-2" />
          Refine This Day
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="feedback"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder={`e.g., "More outdoor activities for Day ${day}", "Find a cheaper restaurant"`}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} size="sm">
              {isLoading ? 'Refining...' : 'Submit Feedback'}
            </Button>
          </form>
        </Form>
      </CollapsibleContent>
    </Collapsible>
  );
}
