'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getTripRecommendationsAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Sun, Cloud, Snowflake, Zap, Loader2 } from 'lucide-react';
import type { TripRecommendation } from '@/lib/types';

const recommendationSchema = z.object({
  climaticCondition: z.string({
    required_error: 'Please select a climatic condition.',
  }),
});

const climateOptions = [
  { value: 'sunny', label: 'Sunny', icon: Sun },
  { value: 'mild', label: 'Mild', icon: Cloud },
  { value: 'snowy', label: 'Snowy', icon: Snowflake },
];

export default function RecommendationsPage() {
  const [recommendations, setRecommendations] = useState<TripRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof recommendationSchema>>({
    resolver: zodResolver(recommendationSchema),
  });

  const onSubmit = async (values: z.infer<typeof recommendationSchema>) => {
    setIsLoading(true);
    setRecommendations([]);
    const result = await getTripRecommendationsAction(values);
    if (result.success && result.data) {
      setRecommendations(result.data.recommendations);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description:
          result.error || 'Failed to get recommendations. Please try again.',
      });
    }
    setIsLoading(false);
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Find Your Next Adventure</CardTitle>
              <CardDescription>
                Select your desired climate, and we'll suggest the perfect
                destinations for you.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(onSubmit)}
                  className="space-y-6"
                >
                  <FormField
                    control={form.control}
                    name="climaticCondition"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Climate Preference</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a climate" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {climateOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                  <option.icon className="h-4 w-4" />
                                  <span>{option.label}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Zap className="mr-2 h-4 w-4" />
                    )}
                    Get Recommendations
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2">
          <h2 className="text-2xl font-bold mb-4">
            {isLoading ? 'Finding destinations...' : 'Your Recommendations'}
          </h2>
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(4)].map((_, i) => (
                 <Card key={i} className="animate-pulse">
                   <CardHeader>
                      <div className="h-6 bg-muted rounded w-3/4"></div>
                   </CardHeader>
                   <CardContent>
                     <div className="h-4 bg-muted rounded w-full mb-2"></div>
                     <div className="h-4 bg-muted rounded w-5/6"></div>
                   </CardContent>
                 </Card>
              ))}
            </div>
          )}
          {!isLoading && recommendations.length === 0 && (
            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg h-full min-h-[300px]">
              <h3 className="text-xl font-semibold text-muted-foreground">
                Destinations await discovery
              </h3>
              <p className="mt-2 text-muted-foreground">
                Choose a climate to see our AI-powered suggestions.
              </p>
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {recommendations.map((rec, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle>{rec.destination}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{rec.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
