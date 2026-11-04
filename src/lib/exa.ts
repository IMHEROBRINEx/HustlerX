import { ExaResult, Goal } from '@/types';

const EXA_API_BASE = 'https://api.exa.ai';

export async function exaSearch(query: string, numResults: number = 5): Promise<ExaResult[]> {
  const apiKey = process.env.EXA_API_KEY;

  if (!apiKey) {
    throw new Error('EXA_API_KEY is not configured');
  }

  const response = await fetch(`${EXA_API_BASE}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      query,
      numResults,
      includeDomains: ['linkedin.com', 'medium.com', 'forbes.com', 'hbr.org', 'business.linkedin.com'],
      excludeDomains: ['linkedin.com/feed', 'linkedin.com/messaging'],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`EXA Search API error: ${error}`);
  }

  const data = await response.json();
  return formatSearchResults(data.results || []);
}

export async function exaNeuralSearch(query: string, numResults: number = 5): Promise<ExaResult[]> {
  const apiKey = process.env.EXA_API_KEY;

  if (!apiKey) {
    throw new Error('EXA_API_KEY is not configured');
  }

  const response = await fetch(`${EXA_API_BASE}/neural/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      query,
      numResults,
      keywords: extractKeywords(query),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`EXA Neural Search API error: ${error}`);
  }

  const data = await response.json();
  return formatSearchResults(data.results || []);
}

function formatSearchResults(results: unknown[]): ExaResult[] {
  return results.map((result: unknown) => {
    const r = result as Record<string, unknown>;
    return {
      title: (r.title as string) || 'Untitled',
      url: (r.url as string) || '',
      snippet: (r.snippet as string) || (r.text as string) || '',
      score: typeof r.score === 'number' ? r.score : undefined,
      publishedDate: (r.publishedDate as string) || (r.date as string),
    };
  });
}

function extractKeywords(query: string): string[] {
  const stopWords = ['how', 'to', 'improve', 'your', 'the', 'for', 'and', 'in', 'on', 'at'];
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => !stopWords.includes(word) && word.length > 2)
    .slice(0, 5);
}

export async function getExaInsights(goal: Goal): Promise<{
  search: ExaResult[];
  neural: ExaResult[];
}> {
  const [searchResults, neuralResults] = await Promise.all([
    exaSearch(goal.description, 5),
    exaNeuralSearch(goal.title + ' ' + goal.description, 5),
  ]);

  return {
    search: searchResults,
    neural: neuralResults,
  };
}

export async function getAllGoalsInsights(goals: Goal[]): Promise<
  Record<string, { search: ExaResult[]; neural: ExaResult[] }>
> {
  const results: Record<string, { search: ExaResult[]; neural: ExaResult[] }> = {};

  for (const goal of goals) {
    try {
      const insights = await getExaInsights(goal);
      results[goal.id] = insights;
    } catch (error) {
      console.error(`Failed to get insights for goal ${goal.id}:`, error);
      results[goal.id] = { search: [], neural: [] };
    }
  }

  return results;
}