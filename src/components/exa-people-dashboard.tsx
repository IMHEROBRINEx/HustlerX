'use client';

import * as React from 'react';
import { AlertTriangle, ExternalLink, GraduationCap, Loader2, MapPin, Search } from 'lucide-react';
import {
  ExaPeopleSearchRequestPayload,
  NormalizedExaPeopleResponse,
  normalizeExaPeopleResponse,
} from '@/lib/exa-people-normalizer';
import { truncateText } from '@/lib/utils';
import { loadUserPageState, saveUserPageState } from '@/lib/page-state-client';
import { Flyer, PinTag, Tape } from '@/components/board';

const QUERY_PLACEHOLDER = 'e.g. Alumni from my college working as product managers in Bengaluru';

const EXAMPLE_QUERIES = [
  'Campus recruiters at tech companies in Hyderabad',
  'Software engineers at fintech startups in Bengaluru',
  'UX designers who mentor students',
];

const DEFAULT_REQUEST: ExaPeopleSearchRequestPayload = {
  query: '',
  category: 'people',
  numResults: 15,
  type: 'auto',
  contents: {
    highlights: {
      maxCharacters: 4000,
    },
  },
};

const PAPERS = ['white', 'sky', 'white', 'yellow', 'white', 'mint'] as const;
const TILTS = [0.6, -0.7, 0.4, -0.5, 0.8, -0.4];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function initialsFromName(name?: string): string {
  if (!name) return '?';

  const parts = name
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  if (parts.length === 0) return '?';
  return parts.map((part) => part[0]?.toUpperCase() ?? '').join('');
}

interface TrussIntelligencePersistedState {
  query?: string;
  resultData?: NormalizedExaPeopleResponse | null;
}

export function ExaPeopleDashboard() {
  const [query, setQuery] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [resultData, setResultData] = React.useState<NormalizedExaPeopleResponse | null>(null);
  const [hasRestoredState, setHasRestoredState] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      try {
        const savedState = await loadUserPageState<TrussIntelligencePersistedState>('truss-intelligence');
        if (!cancelled && savedState) {
          if (typeof savedState.query === 'string') {
            setQuery(savedState.query);
          }

          if (savedState.resultData) {
            setResultData(savedState.resultData);
          }
        }
      } catch (restoreError) {
        console.warn('Failed to restore HustlerX Intelligence state:', restoreError);
      } finally {
        if (!cancelled) {
          setHasRestoredState(true);
        }
      }
    };

    void restore();

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!hasRestoredState) return;

    const timeoutId = setTimeout(() => {
      void saveUserPageState<TrussIntelligencePersistedState>('truss-intelligence', {
        query,
        resultData,
      }).catch((persistError) => {
        console.warn('Failed to persist HustlerX Intelligence state:', persistError);
      });
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [hasRestoredState, query, resultData]);

  const handleSearch = async (overrideQuery?: string) => {
    const trimmedQuery = (overrideQuery ?? query).trim();
    if (!trimmedQuery || isLoading) return;

    const payload: ExaPeopleSearchRequestPayload = {
      ...DEFAULT_REQUEST,
      query: trimmedQuery,
    };

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/exa/people', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = (await response.json()) as unknown;

      if (!response.ok) {
        const errorMessage =
          isRecord(data) && typeof data.error === 'string' ? data.error : 'The people search didn\u2019t go through.';
        throw new Error(errorMessage);
      }

      const normalized =
        isRecord(data) && 'normalized' in data
          ? normalizeExaPeopleResponse(data.normalized)
          : normalizeExaPeopleResponse(data);

      setResultData(normalized);
    } catch (err) {
      console.error('EXA people search error:', err);
      setError(err instanceof Error ? err.message : 'Something went wrong with the search.');
      setResultData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const results = resultData?.results ?? [];

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-[clamp(2.2rem,4.6vw,3.6rem)] font-extrabold leading-[1] tracking-[-0.03em] text-board-ink">
          Find people to ask
        </h1>
        <p className="mt-3 max-w-2xl text-lg leading-8 text-board-muted">
          Search for alumni, recruiters, or people on a team you&apos;d like to join. Open their profile and say hello.
        </p>
      </header>

      <Flyer paper="white" pin="green" tilt={0.4} lift={false} className="p-5 sm:p-8">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSearch();
          }}
        >
          <label htmlFor="people-query" className="font-display text-lg font-bold tracking-[-0.01em] text-ink">
            Who would you like to find?
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              id="people-query"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={QUERY_PLACEHOLDER}
              disabled={isLoading}
              className="min-h-12 w-full rounded-[3px] border-2 border-ink bg-paper px-4 text-base text-ink placeholder:text-ink-faint outline-none transition-shadow focus:shadow-[0_0_0_4px_var(--highlight)] disabled:cursor-not-allowed disabled:opacity-70"
            />
            <button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-[3px] bg-ink px-6 font-display text-base font-bold text-paper transition-transform duration-300 ease-out hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
              {isLoading ? 'Searching...' : 'Search people'}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2" aria-label="Example searches">
            {EXAMPLE_QUERIES.map((example) => (
              <button
                key={example}
                type="button"
                disabled={isLoading}
                onClick={() => {
                  setQuery(example);
                  void handleSearch(example);
                }}
                className="rounded-full bg-paper-sky px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-paper-yellow disabled:opacity-60"
              >
                {example}
              </button>
            ))}
          </div>
        </form>
      </Flyer>

      <div aria-live="polite" className="space-y-10">
        {error ? (
          <Flyer paper="pink" pin={null} tilt={0.5} lift={false} className="p-5">
            <Tape className="-top-3 left-8 rotate-[-4deg]" />
            <p role="alert" className="font-semibold text-ink">
              The search didn&apos;t work: {error}
            </p>
            <p className="mt-1 text-sm text-ink-soft">Check your connection and try again in a moment.</p>
          </Flyer>
        ) : null}

        {resultData && resultData.warnings.length > 0 ? (
          <Flyer paper="yellow" pin={null} tilt={-0.5} lift={false} className="space-y-2 p-5">
            <Tape className="-top-3 left-8 rotate-[3deg]" />
            {resultData.warnings.map((warning, index) => (
              <p key={`warning-${index}`} className="flex items-start gap-2 text-sm text-ink">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {warning}
              </p>
            ))}
          </Flyer>
        ) : null}

        {resultData && results.length > 0 && !isLoading ? (
          <p className="border-y-2 border-board-line py-4 text-board-muted">
            <strong className="font-display text-xl text-board-ink">{results.length}</strong> people found
          </p>
        ) : null}

        {isLoading ? (
          <div className="grid gap-10 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading results">
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                className="flyer animate-pulse bg-paper p-6"
                style={{ '--tilt': `${TILTS[index]}deg` } as React.CSSProperties}
              >
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-full bg-paper-grey" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 w-3/4 rounded-[2px] bg-paper-grey" />
                    <div className="h-3.5 w-1/2 rounded-[2px] bg-paper-grey" />
                  </div>
                </div>
                <div className="mt-5 space-y-2">
                  <div className="h-3.5 rounded-[2px] bg-paper-grey" />
                  <div className="h-3.5 w-2/3 rounded-[2px] bg-paper-grey" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!isLoading && results.length > 0 ? (
          <ul className="grid gap-x-8 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
            {results.map((item, index) => {
              const personName = item.personName || item.author || item.title;
              const topHighlight = item.highlights[0] || '';
              const education = item.educationHistory[0];

              return (
                <li key={item.id}>
                  <Flyer
                    as="article"
                    paper={PAPERS[index % PAPERS.length]}
                    pin={(['green', 'red', 'yellow', 'orange'] as const)[index % 4]}
                    tilt={TILTS[index % TILTS.length]}
                    className="flex h-full flex-col p-6 pt-7"
                  >
                    <div className="flex items-start gap-4">
                      {item.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.image} alt="" className="h-14 w-14 shrink-0 rounded-full object-cover ring-2 ring-ink" />
                      ) : (
                        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink font-display text-base font-bold text-paper">
                          {initialsFromName(personName)}
                        </span>
                      )}
                      <div className="min-w-0">
                        <h2 className="font-display text-xl font-bold leading-tight tracking-[-0.02em] text-ink">{personName}</h2>
                        <p className="mt-1 text-sm leading-6 text-ink-soft">{truncateText(item.title, 90)}</p>
                        {item.location ? (
                          <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-ink-soft">
                            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
                            {item.location}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {topHighlight ? (
                      <p className="mt-4 line-clamp-4 text-sm leading-6 text-ink-soft">{truncateText(topHighlight, 280)}</p>
                    ) : null}

                    {item.workHistory.length > 0 ? (
                      <ul className="mt-4 space-y-1 text-sm text-ink-soft">
                        {item.workHistory.slice(0, 2).map((work, workIndex) => (
                          <li key={`${item.id}-work-${workIndex}`}>
                            <span className="font-semibold text-ink">{work.title}</span>
                            {work.companyName ? <span> at {work.companyName}</span> : null}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    {education ? (
                      <p className="mt-3 flex items-start gap-1.5 text-sm text-ink-soft">
                        <GraduationCap className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                        <span>
                          {education.degree || 'Studied'}
                          {education.institutionName ? ` at ${education.institutionName}` : ''}
                        </span>
                      </p>
                    ) : null}

                    <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
                      {item.url ? (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-[3px] bg-ink px-3.5 text-sm font-bold text-paper"
                        >
                          Open profile
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          <span className="sr-only">(opens in a new tab)</span>
                        </a>
                      ) : (
                        <span />
                      )}
                      {typeof item.highlightScore === 'number' ? (
                        <span className="text-xs text-ink-faint">Match {(item.highlightScore * 100).toFixed(0)}%</span>
                      ) : null}
                    </div>
                  </Flyer>
                </li>
              );
            })}
          </ul>
        ) : null}

        {!isLoading && resultData && results.length === 0 && !error ? (
          <Flyer paper="mint" pin="orange" tilt={-0.6} lift={false} className="max-w-xl p-6">
            <h2 className="font-display text-xl font-bold tracking-[-0.015em]">No one matched that search.</h2>
            <p className="mt-2 leading-7 text-ink-soft">
              Try fewer details, a bigger city, or a broader role like &ldquo;engineer&rdquo; instead of a specific title.
            </p>
          </Flyer>
        ) : null}

        {!isLoading && !resultData && !error ? (
          <div className="flex items-center gap-4 text-board-muted">
            <PinTag className="text-xl text-board-ink">No one pinned yet.</PinTag>
            <span>Try one of the example searches above.</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
