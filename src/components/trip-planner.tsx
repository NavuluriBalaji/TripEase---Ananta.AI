'use client';

import { useState } from 'react';
import { z } from 'zod';
import ReactMarkdown from 'react-markdown';
import { useToast } from '@/hooks/use-toast';
import { generateItineraryAction, analyzeQueryAction, orchestrateTripPlanAction } from '@/app/actions';
import { formSchema, ItineraryForm } from './itinerary-form';
import { ItineraryDisplay } from './itinerary-display';
import type { Itinerary, DayPlan } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, MessageSquare, SlidersHorizontal } from 'lucide-react';
import { Checkout } from './checkout';
import type { CheckoutSuggestions } from './checkout';
import type { CheckoutItem } from '@/app/actions';

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
  const [mode, setMode] = useState<'form' | 'chat'>('form');
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Conversational state
  const [query, setQuery] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<string>('');
  const [suggestions, setSuggestions] = useState<CheckoutSuggestions | undefined>(undefined);

  // Helpers to normalize dynamic questions to stable keys
  const normalizeKey = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  const getAnswerValue = (candidates: string[], fallback?: string): string | undefined => {
    for (const c of candidates) {
      const direct = answers[c];
      if (direct != null && String(direct).trim() !== '') return String(direct).trim();
      const norm = normalizeKey(c);
      const byNorm = answers[norm];
      if (byNorm != null && String(byNorm).trim() !== '') return String(byNorm).trim();
    }
    return fallback;
  };
  const parsePositiveInt = (value?: string | number | null, fallback?: number): number | undefined => {
    if (value === undefined || value === null) return fallback;
    const str = String(value).trim();
    const m = str.match(/(\d{1,3})/);
    const n = m ? Number(m[1]) : Number(str);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
    return fallback;
  };
  const allAnswered = questions.length === 0 || questions.every(q => {
    const val = answers[normalizeKey(q)];
    return val != null && val.trim() !== '';
  });

  // Month helpers for simple date parsing
  const monthIndex: Record<string, number> = {
    jan: 0, january: 0,
    feb: 1, february: 1,
    mar: 2, march: 2,
    apr: 3, april: 3,
    may: 4,
    jun: 5, june: 5,
    jul: 6, july: 6,
    aug: 7, august: 7,
    sep: 8, sept: 8, september: 8,
    oct: 9, october: 9,
    nov: 10, november: 10,
    dec: 11, december: 11,
  };

  function toIsoYmd(d: Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function parseDateRange(text: string): { checkInDate?: string; checkOutDate?: string; durationDays?: number; raw?: string } {
    const t = (text || '').toLowerCase();
    // e.g., November 8th to Nov 10th 2025
    const re = /(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?\s*(?:to|-|–|—)\s*(?:(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?))?\s*(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const m = t.match(re);
    if (m) {
      const m1 = monthIndex[m[1] as string];
      const d1 = parseInt(m[2], 10);
      const y1 = m[3] ? parseInt(m[3], 10) : new Date().getFullYear();
      const m2name = m[4] || m[1];
      const m2 = monthIndex[m2name as string];
      const d2 = parseInt(m[5], 10);
      const y2 = m[6] ? parseInt(m[6], 10) : y1;
      if (Number.isFinite(m1) && Number.isFinite(m2)) {
        const start = new Date(y1, m1, d1);
        const end = new Date(y2, m2, d2);
        const diffMs = end.getTime() - start.getTime();
        const diffDays = Math.max(1, Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1);
        return { checkInDate: toIsoYmd(start), checkOutDate: toIsoYmd(end), durationDays: diffDays, raw: m[0] };
      }
    }
    // Single date like "on November 8th 2025"
    const reSingle = /(?:on\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s*(\d{4}))?/i;
    const s = t.match(reSingle);
    if (s) {
      const mi = monthIndex[s[1] as string];
      const dd = parseInt(s[2], 10);
      const yy = s[3] ? parseInt(s[3], 10) : new Date().getFullYear();
      if (Number.isFinite(mi)) {
        const single = new Date(yy, mi, dd);
        return { checkInDate: toIsoYmd(single), checkOutDate: toIsoYmd(single), durationDays: 1, raw: s[0] };
      }
    }
    return {};
  }

  function extractKeywords(text: string): string[] | undefined {
    const t = (text || '').toLowerCase();
    const keys: string[] = [];
    const add = (k: string, cond: boolean) => { if (cond && !keys.includes(k)) keys.push(k); };
    add('beaches', /beach|seashore|coast/.test(t));
    add('backwaters', /backwater/.test(t));
    add('hill stations', /hill|munnar|wayanad|ooty/.test(t));
    add('wildlife', /wildlife|safari|sanctuary/.test(t));
    add('temples', /temple|spiritual|pilgrim/.test(t));
    add('food', /food|cuisine|seafood|restaurant/.test(t));
    add('shopping', /shopping|market|bazaar/.test(t));
    return keys.length ? keys : undefined;
  }

  // Shared Questions UI to be used in both modes
  const questionsUI = (questions.length > 0) && (
    <div className="space-y-3 mt-4">
      <div className="text-sm font-medium">We need a bit more info to tailor your plan:</div>
      {questions.map((q) => (
        <div key={q} className="flex items-center gap-2">
          <div className="min-w-60 text-sm text-muted-foreground">{q}</div>
          <Input onChange={e => setAnswers(a => ({ ...a, [normalizeKey(q)]: e.target.value }))} />
        </div>
      ))}
      <div className="text-xs text-muted-foreground">You can answer now or continue planning; we’ll fill any gaps with sensible defaults.</div>
      <div className="flex gap-2">
        <Button onClick={plan} disabled={isLoading}>Continue Planning</Button>
      </div>
    </div>
  );

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

  async function analyze() {
    setIsLoading(true);
    setSummary('');
    const res = await analyzeQueryAction({ userQuery: query });
    if (res.success && res.data) {
      setQuestions(res.data.missingQuestions);
      setAnswers({});
    } else {
      setQuestions(['What is your budget (USD)?', 'How many people are traveling?']);
    }
    setIsLoading(false);
  }

  async function plan() {
    setIsLoading(true);

    // Extract fields from prompt or dynamic answers
  const destinationMatch = query.match(/\bto\s+([A-Za-z\s]+?)(?=\s+(?:from|on|for)\b|[.,]|$)/i);
    const durationMatch = query.match(/(\d+)\s*-?\s*day/i);
  const destinationFromAnswers = getAnswerValue(['destination','dest','city','where','whatisyourdestination']);
  const destination = (destinationFromAnswers || (destinationMatch ? destinationMatch[1] : '')).trim().replace(/[.,]+$/,'');

  // Origin: capture cleanly
  const originMatch = query.match(/\bfrom\s+([A-Za-z\s]+?)(?=\s+(?:to|on|for)\b|[.,]|$)/i);
  const originFromAnswers = getAnswerValue(['origin','fromcity','from']);
  const origin = (originFromAnswers || (originMatch ? originMatch[1] : '') || 'your city').trim().replace(/[.,]+$/,'');

    const durationFromAnswers = getAnswerValue(['durationdays','days','triplength','howmanydays','duration']);
    const durationParsed = durationMatch ? parsePositiveInt(durationMatch[1]) : parsePositiveInt(durationFromAnswers);
    const durationDays = durationParsed;

    const budgetStr = getAnswerValue(['budgetusd','budget','pricebudget']);
    const budgetUsd = budgetStr ? Number(budgetStr) : undefined;

  // Party size: parse from prompt too (e.g., family of 4 members)
  const partyInText = query.match(/\b(?:family\s+of\s+|group\s+of\s+)?(\d{1,2})\s*(?:people|persons|members|travelers|adults)\b/i);
  const partyStr = (partyInText && partyInText[1]) || getAnswerValue(['partysize','travelers','people','adults']);
    const partySize = parsePositiveInt(partyStr);

    // Interests: take comma/period-separated tokens from query when available
  const interests = extractKeywords(query);

    // Dates and origin from answers
  const { checkInDate: parsedIn, checkOutDate: parsedOut, durationDays: parsedDur } = parseDateRange(query);
  const checkInDate = parsedIn || getAnswerValue(['checkindate','startdate','from','departuredate','date']);
  const checkOutDate = parsedOut || getAnswerValue(['checkoutdate','enddate','return','returndate']);
  const travelDates = checkInDate || getAnswerValue(['date','traveldate','traveldates','startdate']);
  const finalDuration = durationDays ?? parsedDur;

    // // If still missing basics, ask Analyze-like questions inline
    // if (!destination || !durationDays) {
    //   setIsLoading(false);
    //   toast({ title: 'More info needed', description: 'Please specify destination and trip length (days).' });
    //   if (questions.length === 0) {
    //     setQuestions([
    //       ...(destination ? [] : ['What is your destination?']),
    //       ...(durationDays ? [] : ['How many days is your trip?'])
    //     ]);
    //   }
    //   return;
    // }

  const res = await orchestrateTripPlanAction({ origin, destination, durationDays: finalDuration, budgetUsd, partySize, interests, checkInDate, checkOutDate, travelDates, forceProceed: true });
    if (res.success && res.data) {
      if ('summary' in res.data) {
        setSummary(res.data.summary);
        const raw: any = (res.data as any).raw;
        if (raw) {
          const parseMoney = (s?: any): number => {
            if (!s) return 0;
            const str = String(s);
            const m = str.replace(/[,\s]/g, '').match(/(\$)?(\d+(?:\.\d+)?)/);
            return m ? Number(m[2]) : 0;
          };
          const take = <T,>(arr: T[] | undefined, n = 3) => (Array.isArray(arr) ? arr.slice(0, n) : []);

          const flightItems: CheckoutItem[] | undefined = (() => {
            const fr = Array.isArray(raw?.flights?.frFlights) ? raw.flights.frFlights : undefined;
            if (fr && fr.length) {
              return take(fr, 4).map((f: any) => ({
                category: 'flight',
                description: [f?.airline, f?.flightNumber, f?.departTime && `${f.departTime} → ${f.arriveTime}`, f?.duration]
                  .filter(Boolean)
                  .join(' · '),
                unitPriceUsd: parseMoney(f?.price) || 0,
                quantity: partySize || 1,
              }));
            }
            // fallback: try SerpAPI organic results
            const org = Array.isArray(raw?.flights?.organic_results) ? raw.flights.organic_results : [];
            return take(org, 3).map((o: any) => ({
              category: 'flight',
              description: String(o?.title || o?.snippet || 'Flight option'),
              unitPriceUsd: parseMoney(o?.snippet) || 0,
              quantity: partySize || 1,
            }));
          })();

          const hotelItems: CheckoutItem[] | undefined = (() => {
            const props = Array.isArray(raw?.hotels?.properties) ? raw.hotels.properties : undefined;
            if (props && props.length) {
              return take(props, 4).map((h: any) => ({
                category: 'hotel',
                description: [h?.name, h?.address, h?.overall_rating && `★ ${h.overall_rating}`]
                  .filter(Boolean)
                  .join(' · '),
                unitPriceUsd: parseMoney(h?.rate_per_night?.lowest) || parseMoney(h?.price) || 0,
                quantity: finalDuration || 1,
              }));
            }
            const org = Array.isArray(raw?.hotels?.organic_results) ? raw.hotels.organic_results : [];
            return take(org, 3).map((o: any) => ({
              category: 'hotel',
              description: String(o?.title || o?.snippet || 'Hotel option'),
              unitPriceUsd: parseMoney(o?.snippet) || 0,
              quantity: finalDuration || 1,
            }));
          })();

          const carItems: CheckoutItem[] | undefined = (() => {
            const org = Array.isArray(raw?.cars?.organic_results) ? raw.cars.organic_results : [];
            return take(org, 3).map((o: any) => ({
              category: 'car',
              description: String(o?.title || o?.snippet || 'Car rental option'),
              unitPriceUsd: parseMoney(o?.snippet) || 0,
              quantity: finalDuration || 1,
            }));
          })();

          setSuggestions({
            flights: flightItems && flightItems.length ? flightItems : undefined,
            hotels: hotelItems && hotelItems.length ? hotelItems : undefined,
            cars: carItems && carItems.length ? carItems : undefined,
          });
        }
      } else if ('plan' in res.data) {
        setSummary(JSON.stringify(res.data.plan, null, 2));
        setSuggestions(undefined);
      }
    } else {
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to plan trip.' });
    }
    setIsLoading(false);
  }

  // Payment handled via Checkout component

  return (
    <section className="container mx-auto py-12 px-4">
      <div className="flex items-center gap-2 mb-6">
        <Button variant={mode === 'form' ? 'default' : 'secondary'} onClick={() => setMode('form')}>
          <SlidersHorizontal className="h-4 w-4 mr-2" /> Form
        </Button>
        <Button variant={mode === 'chat' ? 'default' : 'secondary'} onClick={() => setMode('chat')}>
          <MessageSquare className="h-4 w-4 mr-2" /> Conversational
        </Button>
      </div>

      {mode === 'form' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-1 lg:sticky top-20">
            <ItineraryForm onSubmit={handleGenerateItinerary} isLoading={isLoading} />
            {questionsUI}
          </div>
          <div className="lg:col-span-2">
            {isLoading && <LoadingSkeleton />}
            {itinerary && (
              <>
                <ItineraryDisplay itinerary={itinerary} onRefine={handleRefineItinerary} />
                <Checkout suggestions={suggestions} />
              </>
            )}
            {!isLoading && !itinerary && (
              <div className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed rounded-lg h-full min-h-[300px]">
                  <h3 className="text-xl font-semibold text-muted-foreground">Your adventure awaits</h3>
                  <p className="mt-2 text-muted-foreground">Fill in the form to generate your personalized travel itinerary.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Conversational Trip Planner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="e.g., Plan my 5-day trip to Bali. I love beaches, seafood, and sunsets." />
              <Button onClick={analyze} disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Analyze
              </Button>
            </div>
            {questionsUI}
            {summary && (
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown>{summary}</ReactMarkdown>
              </div>
            )}
            {summary && <Checkout suggestions={suggestions} />}
          </CardContent>
        </Card>
      )}
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
