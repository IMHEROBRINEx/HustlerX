'use client';

import * as React from 'react';
import { Target, Sparkles, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Goal, ExaResult } from '@/types';

interface GoalsListProps {
  goals: Goal[];
  exaResults?: Record<string, { search: ExaResult[]; neural: ExaResult[] }>;
  onGetInsights: (goalId: string) => Promise<void>;
  loadingGoalId?: string | null;
}

export function GoalsList({ goals, exaResults, onGetInsights, loadingGoalId }: GoalsListProps) {
  if (!goals || goals.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5" />
            Actionable Goals
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No goals generated yet. Upload a LinkedIn export to get personalized goals.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="w-5 h-5" />
          Actionable Goals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.map((goal, index) => {
          const hasInsights = exaResults?.[goal.id] && 
            (exaResults[goal.id].search.length > 0 || exaResults[goal.id].neural.length > 0);
          const isLoading = loadingGoalId === goal.id;

          return (
            <div
              key={goal.id}
              className="p-4 border rounded-lg hover:bg-accent/5 transition-colors"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-lg">{goal.title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                  
                  {hasInsights && (
                    <div className="mt-3 flex items-center gap-2 text-sm text-green-600">
                      <Sparkles className="w-4 h-4" />
                      <span>AI insights available</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="mt-3 flex justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onGetInsights(goal.id)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : hasInsights ? (
                    'View Insights'
                  ) : (
                    'Get AI Insights'
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}