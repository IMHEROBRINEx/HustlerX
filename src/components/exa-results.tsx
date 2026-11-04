'use client';

import * as React from 'react';
import { ExternalLink, Search, Brain, TrendingUp } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExaResult } from '@/types';
import { cn, truncateText } from '@/lib/utils';

interface ExaResultsProps {
  searchResults: ExaResult[];
  neuralResults: ExaResult[];
  onLoadMore?: (type: 'search' | 'neural') => Promise<void>;
  loading?: boolean;
}

type TabType = 'search' | 'neural';

export function ExaResults({ searchResults, neuralResults, onLoadMore, loading }: ExaResultsProps) {
  const [activeTab, setActiveTab] = React.useState<TabType>('search');

  const results = activeTab === 'search' ? searchResults : neuralResults;
  const isEmpty = !results || results.length === 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            AI Research Findings
          </CardTitle>
        </div>
        
        <div className="flex gap-2 mt-4">
          <Button
            variant={activeTab === 'search' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('search')}
            className="flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            Search ({searchResults.length})
          </Button>
          <Button
            variant={activeTab === 'neural' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('neural')}
            className="flex items-center gap-2"
          >
            <Brain className="w-4 h-4" />
            Neural ({neuralResults.length})
          </Button>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : isEmpty ? (
          <p className="text-center text-muted-foreground py-8">
            No research findings yet. Generate goals to get AI-powered insights.
          </p>
        ) : (
          <div className="grid gap-4">
            {results.map((result, index) => (
              <ExaResultCard key={`${activeTab}-${index}`} result={result} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ExaResultCard({ result }: { result: ExaResult }) {
  return (
    <div className="p-4 border rounded-lg hover:bg-accent/5 transition-colors group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h4 className="font-semibold text-lg group-hover:text-primary transition-colors line-clamp-2">
            {result.title}
          </h4>
          
          {result.snippet && (
            <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
              {truncateText(result.snippet, 250)}
            </p>
          )}
          
          <div className="flex items-center gap-4 mt-3">
            {result.score !== undefined && (
              <div className="flex items-center gap-1 text-sm">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <span className="text-muted-foreground">
                  Score: {Math.round(result.score * 100)}%
                </span>
              </div>
            )}
            
            {result.publishedDate && (
              <span className="text-xs text-muted-foreground">
                {new Date(result.publishedDate).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        
        {result.url && (
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 p-2 rounded-lg hover:bg-accent transition-colors"
            title="Open link"
          >
            <ExternalLink className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
          </a>
        )}
      </div>
    </div>
  );
}

interface ExaResultsGridProps {
  allResults: Record<string, { search: ExaResult[]; neural: ExaResult[] }>;
  selectedGoalId?: string | null;
  onSelectGoal: (goalId: string) => void;
}

export function ExaResultsGrid({ allResults, selectedGoalId, onSelectGoal }: ExaResultsGridProps) {
  const goalIds = Object.keys(allResults);
  
  if (goalIds.length === 0) {
    return null;
  }

  const selectedResults = selectedGoalId ? allResults[selectedGoalId] : null;
  const displayResults = selectedResults || Object.values(allResults)[0];
  const displayGoalId = selectedGoalId || goalIds[0];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        {goalIds.map((goalId) => (
          <Button
            key={goalId}
            variant={displayGoalId === goalId ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelectGoal(goalId)}
          >
            Goal {goalId}
          </Button>
        ))}
      </div>
      
      {displayResults && (
        <ExaResults
          searchResults={displayResults.search}
          neuralResults={displayResults.neural}
        />
      )}
    </div>
  );
}