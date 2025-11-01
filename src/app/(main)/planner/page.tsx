
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
    <div className="flex-1 overflow-auto bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Plan Your Trip</h1>
          <p className="text-gray-600">Let AI help you create the perfect itinerary</p>
        </div>

        {/* Main Card */}
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-xl text-gray-900">Trip Planning Assistant</CardTitle>
          </CardHeader>
          <CardContent className="p-8 space-y-6">
            {/* Query Input */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-900">Describe Your Trip</label>
              <div className="flex gap-2">
                <Input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="e.g., Plan my 5-day trip to Bali. I love beaches, seafood, and sunsets."
                  className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-500"
                />
                <Button onClick={analyze} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white min-w-max">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plane className="mr-2 h-4 w-4" />}
                  Analyze
                </Button>
              </div>
            </div>

            {/* Origin and Travelers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">From Where?</label>
                <Input
                  placeholder="e.g., Hyderabad"
                  onChange={e => setAnswers(a => ({ ...a, origin: e.target.value }))}
                  className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-500"
                />
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-900">Number of Travelers</label>
                <Input
                  placeholder="e.g., 2"
                  onChange={e => setAnswers(a => ({ ...a, travelers: e.target.value }))}
                  className="bg-gray-50 border-gray-200 text-gray-900 placeholder:text-gray-500"
                />
              </div>
            </div>

            {/* Follow-up Questions */}
            {questions.length > 0 && (
              <div className="space-y-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium text-gray-900">Help us refine your plan</h3>
                {questions.map((q, idx) => (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <label className="min-w-48 text-sm text-gray-700 font-medium">{q}</label>
                    <Input
                      onChange={e => setAnswers(a => ({ ...a, [normalizeKey(q)]: e.target.value }))}
                      className="bg-white border-gray-200 text-gray-900 placeholder:text-gray-500 sm:flex-1"
                      placeholder="Enter your answer..."
                    />
                  </div>
                ))}

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <Button onClick={plan} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Generate Itinerary
                  </Button>
                  <Button variant="secondary" onClick={mockPay} className="border-gray-300 text-gray-900 hover:bg-gray-100">
                    Mock Payment (Optional)
                  </Button>
                </div>
              </div>
            )}

            {/* Summary / Results */}
            {summary && (
              <div className="space-y-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-medium text-gray-900">Your Personalized Itinerary</h3>
                <div className="prose prose-sm dark:prose-invert max-w-none text-gray-800">
                  <ReactMarkdown>{summary}</ReactMarkdown>
                </div>
              </div>
            )}

            {/* Loading State */}
            {loading && !summary && (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <p className="text-gray-600 text-sm">Creating your perfect trip...</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
