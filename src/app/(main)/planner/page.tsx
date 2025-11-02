
'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { analyzeQueryAction, orchestrateTripPlanAction, mockInitiatePaymentAction } from '@/app/actions';
import { Loader2, Plane, Copy, Download, Share2, CheckCircle } from 'lucide-react';

export default function PlannerPage() {
  const [query, setQuery] = useState('Plan my 5-day trip to Bali. I love beaches, seafood, and sunsets.');
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [summary, setSummary] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

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

  // Convert USD to INR (1 USD = ~83 INR, approximate rate)
  function convertToINR(usd: number): string {
    const inr = usd * 83;
    return `₹${inr.toLocaleString('en-IN')}`;
  }

  // Get current question and answer
  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[normalizeKey(currentQuestion || '')];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const answeredCount = Object.keys(answers).length;

  // Move to next question
  function nextQuestion() {
    if (currentAnswer?.trim()) {
      if (isLastQuestion) {
        plan();
      } else {
        setCurrentQuestionIndex(prev => prev + 1);
      }
    }
  }

  // Move to previous question
  function prevQuestion() {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  }

  // Skip current question
  function skipQuestion() {
    if (isLastQuestion) {
      plan();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
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

  // Copy to clipboard
  function handleCopy() {
    if (!summary) return;
    navigator.clipboard.writeText(summary).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Download as PDF (using basic HTML to PDF)
  function handleDownloadPDF() {
    if (!summary) return;
    
    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Trip Itinerary</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        h1 { color: #1e3a8a; border-bottom: 3px solid #3730a3; padding-bottom: 10px; }
        h2 { color: #3730a3; border-bottom: 2px solid #e0e7ff; padding-bottom: 8px; margin-top: 20px; }
        h3 { color: #374151; margin-top: 15px; }
        p { margin: 10px 0; }
        ul, ol { margin-left: 20px; }
        li { margin: 8px 0; }
        strong { font-weight: bold; color: #111827; }
        em { font-style: italic; color: #6b7280; }
        blockquote { border-left: 4px solid #93c5fd; padding-left: 15px; margin: 15px 0; background: #f0f9ff; padding: 10px; }
        code { background: #f3f4f6; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
        @page { margin: 20mm; }
      </style>
    </head>
    <body>
      <h1>Your Trip Itinerary</h1>
      ${summary.replace(/\n/g, '<br>')}
      <hr>
      <p style="margin-top: 30px; color: #9ca3af; font-size: 12px;">
        Generated by TripEase - Your Personal Travel Planning AI
      </p>
    </body>
    </html>
    `;
    
    const element = document.createElement('a');
    const file = new Blob([htmlContent], { type: 'text/html' });
    element.href = URL.createObjectURL(file);
    element.download = `TripEase-Itinerary-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  }

  // Share on WhatsApp
  function handleShareWhatsApp() {
    if (!summary) return;
    const encodedMessage = encodeURIComponent(`🌍 *Your Trip Itinerary*\n\n${summary}\n\n✨ Generated by TripEase`);
    window.open(`https://wa.me/?text=${encodedMessage}`, '_blank');
  }

  return (
    <div className="flex-1 overflow-auto bg-gray-50 min-h-screen">
      <div className="w-full h-full">
        {/* Header */}
        <div className="px-8 pt-8 pb-6 border-b border-gray-200 bg-white">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Plan Your Trip</h1>
          <p className="text-gray-600">Let AI help you create the perfect itinerary</p>
        </div>

        {/* Main Content */}
        <div className="w-full h-full overflow-auto">
          <div className="px-8 py-8 space-y-6">
            {/* Trip Planning Assistant */}
            <div className="bg-white rounded-lg p-8 space-y-6">
              <div className="border-b border-gray-200 pb-4">
                <h2 className="text-xl font-semibold text-gray-900">Trip Planning Assistant</h2>
              </div>
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

            {/* Follow-up Questions - Sliding Interface */}
            {questions.length > 0 && currentQuestionIndex < questions.length && (
              <div className="space-y-6 pt-8 border-t border-gray-300">
                {/* Progress Bar */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-gray-900">Question {currentQuestionIndex + 1} of {questions.length}</h3>
                    <span className="text-sm text-gray-600">{answeredCount} answered</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
                    ></div>
                  </div>
                </div>

                {/* Question Card */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-lg font-medium text-gray-900 mb-4">{currentQuestion}</label>
                    <Input
                      value={currentAnswer || ''}
                      onChange={e => setAnswers(a => ({ ...a, [normalizeKey(currentQuestion)]: e.target.value }))}
                      placeholder="Enter your answer..."
                      className="bg-white border-gray-300 text-gray-900 placeholder:text-gray-500 text-base py-3"
                      autoFocus
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && currentAnswer?.trim()) {
                          nextQuestion();
                        }
                      }}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    {currentQuestionIndex > 0 && (
                      <Button 
                        onClick={prevQuestion}
                        variant="outline"
                        className="border-gray-300 text-gray-900 hover:bg-gray-100"
                      >
                        ← Back
                      </Button>
                    )}
                    
                    <Button 
                      onClick={skipQuestion}
                      variant="outline"
                      className="border-gray-300 text-gray-600 hover:bg-gray-100"
                    >
                      Skip
                    </Button>

                    <Button 
                      onClick={nextQuestion}
                      disabled={!currentAnswer?.trim()}
                      className="bg-blue-600 hover:bg-blue-700 text-white ml-auto"
                    >
                      {isLastQuestion ? (
                        <>
                          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          Generate Itinerary
                        </>
                      ) : (
                        <>
                          Next →
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Summary / Results */}
            {summary && (
              <div className="space-y-6 pt-8 border-t border-gray-300">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900 mb-2">Your Itinerary</h2>
                  <p className="text-gray-600">Your personalized travel plan</p>
                </div>

                {/* Content with Clean Typography */}
                <div className="prose prose-base dark:prose-invert max-w-none text-gray-800
                  prose-h1:text-2xl prose-h1:font-bold prose-h1:text-gray-900 prose-h1:mb-3
                  prose-h2:text-xl prose-h2:font-bold prose-h2:text-gray-800 prose-h2:mb-2 prose-h2:mt-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-gray-300
                  prose-h3:text-lg prose-h3:font-semibold prose-h3:text-gray-900 prose-h3:mb-2
                  prose-p:text-base prose-p:leading-relaxed prose-p:mb-3 prose-p:text-gray-700
                  prose-li:my-1 prose-li:text-gray-700
                  prose-ul:my-3 prose-ul:ml-5
                  prose-ol:my-3 prose-ol:ml-5
                  prose-strong:font-bold prose-strong:text-gray-900
                  prose-em:italic prose-em:text-gray-600
                  prose-a:text-blue-600 prose-a:underline hover:prose-a:text-blue-800
                  prose-blockquote:border-l-4 prose-blockquote:border-gray-400 prose-blockquote:bg-gray-50 prose-blockquote:p-3
                  prose-code:bg-gray-100 prose-code:px-2 prose-code:py-1 prose-code:rounded prose-code:text-gray-800
                ">
                  <ReactMarkdown
                    components={{
                      a: (props: any) => (
                        <a 
                          {...props} 
                          className="text-blue-600 underline hover:text-blue-800 cursor-pointer"
                          target="_blank"
                          rel="noopener noreferrer"
                        />
                      ),
                      h1: (props: any) => <h1 className="text-2xl font-bold text-gray-900 mb-3 pb-2 border-b border-gray-300" {...props} />,
                      h2: (props: any) => <h2 className="text-xl font-bold text-gray-800 mb-2 mt-4 pb-2 border-b border-gray-300" {...props} />,
                      h3: (props: any) => <h3 className="text-lg font-semibold text-gray-900 mb-2 mt-3" {...props} />,
                      p: (props: any) => <p className="text-base leading-relaxed mb-3 text-gray-700" {...props} />,
                      ul: (props: any) => <ul className="list-disc list-inside my-3 ml-4 space-y-1" {...props} />,
                      ol: (props: any) => <ol className="list-decimal list-inside my-3 ml-4 space-y-1" {...props} />,
                      li: (props: any) => <li className="text-gray-700 ml-2" {...props} />,
                      strong: (props: any) => <strong className="font-bold text-gray-900" {...props} />,
                      blockquote: (props: any) => <blockquote className="border-l-4 border-gray-400 bg-gray-50 p-3 my-3 rounded italic text-gray-700" {...props} />,
                    }}
                  >
                    {summary}
                  </ReactMarkdown>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3 pt-6">
                  <Button
                    onClick={handleCopy}
                    className={`${
                      copied
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-gray-700 hover:bg-gray-800'
                    } text-white transition-all duration-300`}
                  >
                    {copied ? (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={handleDownloadPDF}
                    className="bg-gray-700 hover:bg-gray-800 text-white transition-all duration-300"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>

                  <Button
                    onClick={handleShareWhatsApp}
                    className="bg-green-600 hover:bg-green-700 text-white transition-all duration-300"
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share on WhatsApp
                  </Button>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
