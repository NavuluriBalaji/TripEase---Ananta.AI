'use client';

import { useState, useEffect } from 'react';
import { getTourismNewsAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Newspaper, Loader2 } from 'lucide-react';

export default function NewsPage() {
  const [news, setNews] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchNews = async () => {
    setIsLoading(true);
    const result = await getTourismNewsAction();
    if (result.success && result.data) {
      setNews(result.data.newsSummary);
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.error || 'Failed to fetch news. Please try again.',
      });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchNews();
  }, []);

  return (
    <div className="container mx-auto py-12 px-4">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Newspaper />
                Tourism News
              </CardTitle>
              <CardDescription>
                Your daily digest of travel and tourism headlines, powered by AI.
              </CardDescription>
            </div>
            <Button onClick={fetchNews} disabled={isLoading} variant="outline">
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              <div className="h-6 bg-muted rounded w-1/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-5/6"></div>
              </div>
               <div className="h-6 bg-muted rounded w-1/3 mt-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-full"></div>
                <div className="h-4 bg-muted rounded w-4/6"></div>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm max-w-none text-foreground">
               {news.split('\n').map((paragraph, index) => {
                  if (paragraph.startsWith('###')) {
                    return <h3 key={index} className="font-bold text-lg mt-4 mb-2">{paragraph.replace('###', '').trim()}</h3>;
                  }
                   if (paragraph.startsWith('**')) {
                    return <p key={index} className="font-semibold">{paragraph.replace(/\*\*/g, '')}</p>;
                  }
                  return <p key={index}>{paragraph}</p>;
               })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
