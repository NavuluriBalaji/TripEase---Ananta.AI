
'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { analyzeQueryAction, orchestrateTripPlanAction, mockInitiatePaymentAction } from '@/app/actions';
import { Loader2, Plane } from 'lucide-react';

export default function PlannerPage() {
  const [query, setQuery] = useState('Plan my 5-day trip to Bali. I love beaches, seafood, and sunsets.');
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Normalize arbitrary question labels to safe keys
  function normalizeKey(s: string) {
    return (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '');
  }

  // Try multiple possible keys that users or models might use
  function getAnswerValue(candidates: string[], fallback?: string): string | undefined {
    for (const c of candidates) {
      const direct = answers[c];
      if (direct != null && String(direct).trim() !== '') return String(direct).trim();
      const norm = normalizeKey(c);
      const byNorm = answers[norm];
      if (byNorm != null && String(byNorm).trim() !== '') return String(byNorm).trim();
    }
    return fallback;
  }

  function parsePositiveInt(value?: string | number | null, fallback?: number): number | undefined {
    if (value === undefined || value === null) return fallback;
    const str = String(value).trim();
    const m = str.match(/(\d{1,3})/); // small, pragmatic bound
    const n = m ? Number(m[1]) : Number(str);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
    return fallback;
  }

  async function analyze() {
    setLoading(true);
    setSummary('');
    const res = await analyzeQueryAction({ userQuery: query });
    if (res.success && res.data) {
      setQuestions(res.data.missingQuestions);
    } else {
      setQuestions(['What is your budget (USD)?', 'How many people are traveling?']);
    }
    setLoading(false);
  }

  async function plan() {
    setLoading(true);
    const destinationMatch = query.match(/\bto\s+([A-Za-z\s]+?)(?:[.,]|$)/i);
    const durationMatch = query.match(/(\d+)\s*-?\s*day/i);

    const destinationFromAnswers = getAnswerValue(['destination','dest','city','where','whatisyourdestination']);
    const destination = (destinationFromAnswers || (destinationMatch ? destinationMatch[1] : '')).trim().replace(/[.,]+$/,'') || 'Bali';

  const durationFromAnswers = getAnswerValue(['durationdays','days','triplength','howmanydays','duration']);
  const durationParsed = durationMatch ? parsePositiveInt(durationMatch[1]) : parsePositiveInt(durationFromAnswers);
  const durationDays = durationParsed ?? 5;

    const budgetStr = getAnswerValue(['budgetusd','budget','pricebudget']);
    const budgetUsd = budgetStr ? Number(budgetStr) : undefined;

  const partyStr = getAnswerValue(['partysize','travelers','people','adults']);
  const partySize = parsePositiveInt(partyStr);

    const interests = query.toLowerCase().includes('beach') ? ['beaches'] : undefined;
    const checkInDate = getAnswerValue(['checkindate','startdate','from','departuredate','date']);
    const checkOutDate = getAnswerValue(['checkoutdate','enddate','return','returndate']);
  const origin = getAnswerValue(['origin','fromcity','from']) || 'your city';
  const travelers = getAnswerValue(['travelers','partysize','people','adults']);
  const travelersNum = parsePositiveInt(travelers, partySize);
    const travelDates = checkInDate || getAnswerValue(['date','traveldate','traveldates','startdate']);

  const res = await orchestrateTripPlanAction({ origin, destination, durationDays, budgetUsd, partySize: travelersNum, interests, checkInDate, checkOutDate, travelDates });
    if (res.success && res.data) {
      // Handle ADK required questions first
      if ('required_questions' in res.data && Array.isArray((res as any).data.required_questions)) {
        setQuestions((res as any).data.required_questions as string[]);
        setSummary('');
        setLoading(false);
        return;
      }
      // Handle Genkit clarifier path
      if ((res as any).data.raw?.status === 'needs_info') {
        const text: string = (res as any).data.summary || '';
        const qs = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        setQuestions(qs);
        setSummary('');
      } else if ('summary' in res.data) {
        setSummary(res.data.summary);
      } else if ('plan' in res.data) {
        setSummary(JSON.stringify(res.data.plan, null, 2));
      }
    }
    setLoading(false);
  }

  async function mockPay() {
    await mockInitiatePaymentAction(answers['budgetUsd'] ? Number(answers['budgetUsd']) : 0);
    alert('Mock payment confirmed (optional)');
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Trip Planner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input value={query} onChange={e => setQuery(e.target.value)} placeholder="Describe your trip..." />
            <Button onClick={analyze} disabled={loading}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plane className="mr-2 h-4 w-4" />}
              Analyze
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <Input placeholder="Origin city (e.g., Hyderabad)" onChange={e => setAnswers(a => ({ ...a, origin: e.target.value }))} />
            <Input placeholder="Travelers (e.g., 2)" onChange={e => setAnswers(a => ({ ...a, travelers: e.target.value }))} />
          </div>
          {questions.length > 0 && (
            <div className="space-y-3">
              {questions.map((q) => (
                <div key={q} className="flex items-center gap-2">
                  <div className="min-w-60 text-sm text-muted-foreground">{q}</div>
                  <Input onChange={e => setAnswers(a => ({ ...a, [normalizeKey(q)]: e.target.value }))} />
                </div>
              ))}
              <div className="flex gap-2">
                <Button onClick={plan} disabled={loading}>Plan Trip</Button>
                <Button variant="secondary" onClick={mockPay}>Mock Payment (optional)</Button>
              </div>
            </div>
          )}
          {summary && (
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
