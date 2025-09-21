'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Sparkles, MapPin, CalendarDays, Wallet, Feather } from 'lucide-react';

export const formSchema = z.object({
  destination: z.string().min(2, { message: 'Destination must be at least 2 characters.' }),
  duration: z.coerce.number().int().min(1, { message: 'Duration must be at least 1 day.' }),
  budget: z.coerce.number().min(1, { message: 'Budget must be a positive number.' }),
  travelStyle: z.string({ required_error: 'Please select a travel style.' }),
  preferences: z.string().min(10, { message: 'Preferences must be at least 10 characters.' }),
});

type ItineraryFormProps = {
  onSubmit: (values: z.infer<typeof formSchema>) => void;
  isLoading: boolean;
};

const travelStyles = ['Adventurous', 'Relaxed', 'Luxury', 'Backpacking', 'Family', 'Cultural'];

export function ItineraryForm({ onSubmit, isLoading }: ItineraryFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      destination: 'Kyoto, Japan',
      duration: 3,
      budget: 1500,
      travelStyle: 'Cultural',
      preferences: 'I love ancient temples, trying authentic matcha, and staying in quiet, traditional ryokans.',
    },
  });

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Plan Your Dream Trip</CardTitle>
        <CardDescription>Fill out the details below and let our AI create a personalized itinerary for you.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="destination"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Destination</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="e.g., Paris, France" {...field} className="pl-10" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (days)</FormLabel>
                    <FormControl>
                       <div className="relative">
                        <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type="number" placeholder="e.g., 7" {...field} className="pl-10"/>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="budget"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Budget (USD)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input type="number" placeholder="e.g., 2000" {...field} className="pl-10" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="travelStyle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Travel Style</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                           <div className="relative">
                            <Feather className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <SelectTrigger className="pl-10">
                              <SelectValue placeholder="Select a travel style" />
                            </SelectTrigger>
                          </div>
                        </FormControl>
                        <SelectContent>
                          {travelStyles.map(style => (
                            <SelectItem key={style} value={style}>{style}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            <FormField
              control={form.control}
              name="preferences"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preferences & Interests</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., I love hiking, visiting museums, and trying local street food."
                      className="resize-none"
                      rows={4}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isLoading} size="lg" className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
              {isLoading ? 'Generating...' : 'Generate Trip'}
              <Sparkles className="ml-2 h-5 w-5" />
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
