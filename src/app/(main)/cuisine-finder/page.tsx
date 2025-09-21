'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
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
import { Input } from '@/components/ui/input';
import { findLocalCuisineAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ChefHat, Utensils, MapPin, Search } from 'lucide-react';
import type { FindLocalCuisineOutput } from '@/ai/flows/find-local-cuisine';

const formSchema = z.object({
  destination: z.string().min(2, { message: 'Destination is required.' }),
});

export default function CuisineFinderPage() {
  const [cuisineResult, setCuisineResult] = useState<FindLocalCuisineOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      destination: 'Rome, Italy',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    setCuisineResult(null);
    const result = await findLocalCuisineAction(values);
    if (result.success && result.data) {
        setCuisineResult(result.data);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error || 'Failed to get cuisine recommendations. Please try again.',
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
              <CardTitle className="flex items-center gap-2">
                <ChefHat />
                Local Cuisine Finder
              </CardTitle>
              <CardDescription>
                Discover the best food a destination has to offer, recommended by our AI food critic.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="destination"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Destination</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Bangkok, Thailand" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    Find Food
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2">
          <h2 className="text-2xl font-bold mb-4">
            {isLoading ? 'Searching for recommendations...' : 'Foodie Recommendations'}
          </h2>
          {isLoading && (
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[...Array(2)].map((_, i) => (
                 <Card key={i} className="animate-pulse">
                   <CardHeader>
                      <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                      <div className="h-4 bg-muted rounded w-1/2"></div>
                   </CardHeader>
                   <CardContent className="space-y-2">
                     <div className="h-4 bg-muted rounded w-full"></div>
                     <div className="h-4 bg-muted rounded w-5/6"></div>
                   </CardContent>
                 </Card>
              ))}
            </div>
          )}
          {!isLoading && !cuisineResult && (
            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg h-full min-h-[300px]">
              <h3 className="text-xl font-semibold text-muted-foreground">
                Taste the world
              </h3>
              <p className="mt-2 text-muted-foreground">
                Enter a destination to get delicious recommendations.
              </p>
            </div>
          )}
          {cuisineResult && (
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {cuisineResult.recommendations.map((rec, index) => (
                    <Card key={index} className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Utensils className="text-primary"/>{rec.dishName}</CardTitle>
                            <CardDescription>{rec.dishDescription}</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-grow">
                           <div className="text-sm p-3 bg-muted/50 rounded-md">
                                <p className="font-semibold">{rec.restaurantName}</p>
                                <p className="text-muted-foreground flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0"/> {rec.restaurantAddress}</p>
                           </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
