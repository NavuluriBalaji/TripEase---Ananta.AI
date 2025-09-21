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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { generatePackingListAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles, Briefcase, Check } from 'lucide-react';
import type { GeneratePackingListOutput } from '@/ai/flows/generate-packing-list';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const packingListSchema = z.object({
  destination: z.string().min(2, { message: 'Destination is required.' }),
  duration: z.coerce.number().int().min(1, { message: 'Duration must be at least 1 day.' }),
  travelStyle: z.string({ required_error: 'Please select a travel style.' }),
  preferences: z.string().optional(),
});

const travelStyles = ['Adventurous', 'Relaxed', 'Luxury', 'Backpacking', 'Family', 'Cultural'];

export default function PackingAssistantPage() {
  const [packingList, setPackingList] = useState<GeneratePackingListOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [packedItems, setPackedItems] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const form = useForm<z.infer<typeof packingListSchema>>({
    resolver: zodResolver(packingListSchema),
    defaultValues: {
      destination: 'Kyoto, Japan',
      duration: 5,
      travelStyle: 'Cultural',
      preferences: 'Planning to visit temples, walk in the gardens, and enjoy some nice dinners.',
    },
  });

  const onSubmit = async (values: z.infer<typeof packingListSchema>) => {
    setIsLoading(true);
    setPackingList(null);
    setPackedItems(new Set());
    const result = await generatePackingListAction({
        ...values,
        preferences: values.preferences || '',
    });
    if (result.success && result.data) {
      setPackingList(result.data);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error || 'Failed to get packing list. Please try again.',
      });
    }
    setIsLoading(false);
  };
  
  const togglePackedItem = (item: string) => {
    setPackedItems(prev => {
        const newSet = new Set(prev);
        if (newSet.has(item)) {
            newSet.delete(item);
        } else {
            newSet.add(item);
        }
        return newSet;
    })
  }

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase />
                AI Packing Assistant
              </CardTitle>
              <CardDescription>
                Never forget an item again. Tell us about your trip, and we'll create a personalized packing list for you.
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
                          <Input placeholder="e.g., Paris, France" {...field} />
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
                          <Input type="number" placeholder="e.g., 7" {...field} />
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
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a travel style" />
                                </SelectTrigger>
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
                  <FormField
                    control={form.control}
                    name="preferences"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Activities & Preferences</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="e.g., Hiking, beach days, fancy dinners"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button type="submit" disabled={isLoading} className="w-full">
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    Generate List
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
        <div className="md:col-span-2">
          <h2 className="text-2xl font-bold mb-4">
            {isLoading ? 'Generating your list...' : 'Your Packing List'}
          </h2>
          {isLoading && (
             <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                        <div className="h-6 bg-muted rounded w-1/3 mb-4"></div>
                        <div className="space-y-3">
                            <div className="h-5 bg-muted rounded w-3/4"></div>
                            <div className="h-5 bg-muted rounded w-5/6"></div>
                            <div className="h-5 bg-muted rounded w-1/2"></div>
                        </div>
                    </div>
                ))}
             </div>
          )}
          {!isLoading && !packingList && (
            <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg h-full min-h-[300px]">
              <h3 className="text-xl font-semibold text-muted-foreground">
                Your packing list will appear here
              </h3>
              <p className="mt-2 text-muted-foreground">
                Fill out the form to get started.
              </p>
            </div>
          )}
          {packingList && (
            <div className="space-y-6">
                {packingList.packingList.map((category) => (
                    <div key={category.category}>
                        <h3 className="font-semibold text-lg mb-3 border-b pb-2">{category.category}</h3>
                        <div className="space-y-2">
                            {category.items.map((item) => (
                                <div key={item} className="flex items-center space-x-3">
                                    <Checkbox
                                      id={item}
                                      checked={packedItems.has(item)}
                                      onCheckedChange={() => togglePackedItem(item)}
                                    />
                                    <Label
                                      htmlFor={item}
                                      className={`text-sm ${packedItems.has(item) ? 'line-through text-muted-foreground' : ''}`}
                                    >
                                      {item}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
