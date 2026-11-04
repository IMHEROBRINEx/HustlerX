'use client';

import * as React from 'react';
import { AlertTriangle, Briefcase, Building2, Clock3, ExternalLink, Loader2, MapPin, Search } from 'lucide-react';
import { DegreeStamp, Flyer, PinTag, Stamp, Tape } from '@/components/board';

const QUERY_PLACEHOLDER = 'e.g. Software engineering internships in Bengaluru that mention React';

const EXAMPLE_QUERIES = [
  'Frontend internships in Bengaluru',
  'Summer finance internships in Mumbai',
  'Remote product design internships',
  'Data analyst internships at startups in Pune',
];

const WINDOWS = [
  { days: 1, label: '24 hours' },
  { days: 3, label: '3 days' },
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
] as const;

const POST_PAPERS = ['white', 'yellow', 'white', 'mint', 'white', 'sky'] as const;
const PINS = ['red', 'green', 'orange', 'yellow'] as const;
const TILTS = [-0.8, 0.6, -0.4, 0.9, -0.6, 0.4];
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

interface SearchResult {
  id: string;
  kind: 'post' | 'job';
  title: string;
  url: string;
  snippet: string;
  connectionDegree: 1 | 2 | null;
  degreeEvidence?: string;
  publishedDate?: string;
  author?: string;
  company?: string;
  location?: string;
  logoUrl?: string;
  score?: number;
}

interface SearchResponse {
  success: boolean;
  query?: string;
  appliedQuery?: string;
  freshness?: {
    source: 'query' | 'picker';
    label: string;
    maxAgeDays?: number;
    cutoffIso: string;
  };
  posts?: SearchResult[];
  jobs?: SearchResult[];
  jobsSearch?: {
    source: 'linkedin' | 'exa';
    keywords: string;
    location: string;
    remoteOnly: boolean;
  };
  counts?: {
    postsExamined: number;
    jobsExamined: number;
    droppedOld: number;
    droppedUndated: number;
    droppedOffTopic: number;
  };
  warnings?: string[];
  error?: string;
}

function formatDate(value?: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatRelativeTime(value?: string): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return value;

  const deltaMs = Date.now() - date.getTime();
  if (deltaMs < 0) return 'just now';

  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;

  if (deltaMs < hourMs) return `${Math.max(1, Math.round(deltaMs / minuteMs))} min ago`;
  if (deltaMs < dayMs) return `${Math.max(1, Math.round(deltaMs / hourMs))} hr ago`;
  if (deltaMs < 7 * dayMs) {
    const days = Math.max(1, Math.round(deltaMs / dayMs));
    return days === 1 ? 'Yesterday' : `${days} days ago`;
  }
  const weeks = Math.max(1, Math.round(deltaMs / (7 * dayMs)));
  return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
}

function isVeryFresh(value?: string): boolean {
  if (!value) return false;
  const time = new Date(value).getTime();
  return Number.isFinite(time) && Date.now() - time <= TWO_DAYS_MS;
}

function PostedTime({ value }: { value?: string }) {
  const relative = formatRelativeTime(value);
  if (!relative) return null;
  const fresh = isVeryFresh(value);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-[2px] px-1.5 py-0.5 text-xs font-semibold ${
        fresh ? 'bg-highlight text-ink' : 'text-ink-soft'
      }`}
      title={formatDate(value)}
    >
      <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
      {relative}
    </span>
  );
}

function OpenLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex min-h-10 items-center gap-1.5 rounded-[3px] bg-ink px-3.5 text-sm font-bold text-paper"
    >
      {children}
      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
      <span className="sr-only">(opens in a new tab)</span>
    </a>
  );
}

function PostCard({ result, index }: { result: SearchResult; index: number }) {
  return (
    <Flyer
      as="article"
      paper={POST_PAPERS[index % POST_PAPERS.length]}
      pin={PINS[index % PINS.length]}
      tilt={TILTS[index % TILTS.length]}
      className="flex h-full flex-col p-6 pt-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        {result.connectionDegree ? <DegreeStamp degree={result.connectionDegree} /> : <Stamp>Hiring post</Stamp>}
        <PostedTime value={result.publishedDate} />
      </div>

      <h3 className="mt-3 font-display text-xl font-bold leading-[1.15] tracking-[-0.02em] text-ink">{result.title}</h3>
      <p className="mt-2 line-clamp-5 text-sm leading-6 text-ink-soft">{result.snippet}</p>

      <div className="mt-auto pt-5">
        {result.author ? <PinTag>Posted by {result.author}</PinTag> : null}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <OpenLink href={result.url}>Open post</OpenLink>
          {typeof result.score === 'number' ? (
            <span className="text-xs text-ink-faint">Match {(result.score * 100).toFixed(0)}%</span>
          ) : null}
        </div>
        {result.degreeEvidence ? <p className="mt-3 text-xs text-ink-faint">How we know: {result.degreeEvidence}</p> : null}
      </div>
    </Flyer>
  );
}

function JobCard({ result, index }: { result: SearchResult; index: number }) {
  return (
    <Flyer
      as="article"
      paper="white"
      pin={null}
      tilt={TILTS[(index + 2) % TILTS.length] / 2}
      className="flex h-full flex-col border-t-[6px] border-ink p-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Stamp>Job listing</Stamp>
        <PostedTime value={result.publishedDate} />
      </div>

      <div className="mt-3 flex items-start gap-3">
        {result.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={result.logoUrl}
            alt=""
            width={44}
            height={44}
            loading="lazy"
            referrerPolicy="no-referrer"
            className="h-11 w-11 shrink-0 rounded-[3px] border border-rule bg-paper object-contain"
          />
        ) : null}
        <h3 className="font-display text-lg font-bold leading-[1.2] tracking-[-0.015em] text-ink">{result.title}</h3>
      </div>
      <div className="mt-2 space-y-1 text-sm text-ink-soft">
        {result.company ? (
          <p className="flex items-center gap-1.5 font-semibold text-ink">
            <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            {result.company}
          </p>
        ) : null}
        {result.location ? (
          <p className="flex items-center gap-1.5">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            {result.location}
          </p>
        ) : null}
      </div>
      {result.snippet ? <p className="mt-3 line-clamp-3 text-sm leading-6 text-ink-soft">{result.snippet}</p> : null}

      <div className="mt-auto pt-5">
        <OpenLink href={result.url}>View on LinkedIn</OpenLink>
      </div>
    </Flyer>
  );
}

function SectionHeading({ title, count, note }: { title: string; count: number; note: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
      <h2 className="font-display text-2xl font-extrabold tracking-[-0.02em] text-board-ink">
        {title} <span className="text-paper-yellow">{count}</span>
      </h2>
      <p className="text-sm text-board-muted">{note}</p>
    </div>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <Flyer paper="mint" pin={null} tilt={-0.4} lift={false} className="max-w-xl p-5">
      <Tape className="-top-3 left-8 rotate-[-3deg]" />
      <p className="text-sm leading-6 text-ink">{children}</p>
    </Flyer>
  );
}

export function JobPostSearchPage() {
  const [query, setQuery] = React.useState('');
  const [maxAgeDays, setMaxAgeDays] = React.useState<number>(7);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [responseData, setResponseData] = React.useState<SearchResponse | null>(null);

  const handleSearch = async (overrideQuery?: string, overrideDays?: number) => {
    const trimmedQuery = (overrideQuery ?? query).trim();
    if (!trimmedQuery || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/exa/job-posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: trimmedQuery, maxAgeDays: overrideDays ?? maxAgeDays }),
      });

      const data = (await response.json()) as SearchResponse;
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'The search didn\u2019t go through.');
      }

      setResponseData(data);
    } catch (searchError) {
      console.error('Job search failed:', searchError);
      setError(searchError instanceof Error ? searchError.message : 'Something went wrong with the search.');
      setResponseData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const posts = responseData?.posts || [];
  const jobs = responseData?.jobs || [];
  const freshness = responseData?.freshness;

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-display text-[clamp(2.2rem,4.6vw,3.6rem)] font-extrabold leading-[1] tracking-[-0.03em] text-board-ink">
          Find internships and jobs
        </h1>
        <p className="mt-3 max-w-2xl text-lg leading-8 text-board-muted">
          Live LinkedIn job listings, plus hiring posts from people. Newest first. Searches cover India unless you name
          another place.
        </p>
      </header>

      <Flyer paper="white" pin="red" tilt={-0.4} lift={false} className="p-5 sm:p-8">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void handleSearch();
          }}
        >
          <label htmlFor="job-query" className="font-display text-lg font-bold tracking-[-0.01em] text-ink">
            What are you looking for?
          </label>
          <textarea
            id="job-query"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                void handleSearch();
              }
            }}
            rows={2}
            placeholder={QUERY_PLACEHOLDER}
            disabled={isLoading}
            className="mt-3 w-full resize-y rounded-[3px] border-2 border-ink bg-paper px-4 py-3 text-base leading-7 text-ink placeholder:text-ink-faint outline-none transition-shadow focus:shadow-[0_0_0_4px_var(--highlight)] disabled:cursor-not-allowed disabled:opacity-70"
          />

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

          <fieldset className="mt-6">
            <legend className="text-sm font-semibold text-ink">Posted within</legend>
            <div className="mt-2 inline-flex flex-wrap rounded-[3px] border-2 border-ink">
              {WINDOWS.map((option) => {
                const selected = maxAgeDays === option.days;
                return (
                  <label
                    key={option.days}
                    className={`cursor-pointer border-ink px-3.5 py-2 text-sm font-semibold transition-colors not-last:border-r-2 has-[:focus-visible]:outline has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-highlight ${
                      selected ? 'bg-paper-yellow text-ink' : 'bg-paper text-ink-soft hover:bg-paper-grey'
                    }`}
                  >
                    <input
                      type="radio"
                      name="max-age"
                      value={option.days}
                      checked={selected}
                      onChange={() => {
                        setMaxAgeDays(option.days);
                        if (responseData && query.trim()) void handleSearch(undefined, option.days);
                      }}
                      className="sr-only"
                    />
                    {option.label}
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-ink-faint">
              Writing &ldquo;today&rdquo; or &ldquo;last 3 days&rdquo; in your search overrides this.
            </p>
          </fieldset>

          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-[3px] bg-ink px-6 font-display text-base font-bold text-paper transition-transform duration-300 ease-out hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Search className="h-4 w-4" aria-hidden="true" />}
            {isLoading ? 'Searching...' : 'Search'}
          </button>
        </form>
      </Flyer>

      <div aria-live="polite" className="space-y-12">
        {error ? (
          <Flyer paper="pink" pin={null} tilt={0.5} lift={false} className="p-5">
            <Tape className="-top-3 left-8 rotate-[-4deg]" />
            <p role="alert" className="font-semibold text-ink">
              The search didn&apos;t work: {error}
            </p>
            <p className="mt-1 text-sm text-ink-soft">Check your connection and try again in a moment.</p>
          </Flyer>
        ) : null}

        {responseData?.warnings && responseData.warnings.length > 0 ? (
          <Flyer paper="yellow" pin={null} tilt={-0.5} lift={false} className="space-y-2 p-5">
            <Tape className="-top-3 left-8 rotate-[3deg]" />
            {responseData.warnings.map((warning, index) => (
              <p key={`warning-${index}`} className="flex items-start gap-2 text-sm text-ink">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                {warning}
              </p>
            ))}
          </Flyer>
        ) : null}

        {freshness && !isLoading ? (
          <p className="border-y-2 border-board-line py-4 text-board-muted">
            Everything below was posted in the{' '}
            <strong className="font-display text-lg text-board-ink">{freshness.label}</strong>
            {freshness.source === 'query' ? ' (from your search)' : ''}, newest first. Highlighted times are under 2 days
            old.
            {responseData?.counts && responseData.counts.droppedOffTopic > 0
              ? ` ${responseData.counts.droppedOffTopic} fresh results that didn\u2019t match your role or city were hidden.`
              : ''}
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
                <div className="h-5 w-24 rounded-full bg-paper-grey" />
                <div className="mt-4 h-6 w-4/5 rounded-[2px] bg-paper-grey" />
                <div className="mt-3 space-y-2">
                  <div className="h-3.5 rounded-[2px] bg-paper-grey" />
                  <div className="h-3.5 rounded-[2px] bg-paper-grey" />
                  <div className="h-3.5 w-2/3 rounded-[2px] bg-paper-grey" />
                </div>
              </div>
            ))}
          </div>
        ) : null}

        {!isLoading && responseData && !error ? (
          <>
            <section className="space-y-8" aria-labelledby="jobs-heading">
              <div id="jobs-heading">
                <SectionHeading
                  title="Job listings on LinkedIn"
                  count={jobs.length}
                  note={
                    responseData.jobsSearch?.source === 'linkedin'
                      ? `Live from LinkedIn: \u201c${responseData.jobsSearch.keywords}\u201d in ${responseData.jobsSearch.location}${
                          responseData.jobsSearch.remoteOnly ? ', remote only' : ''
                        }.`
                      : 'Official openings. Put a city in your search to keep these local.'
                  }
                />
              </div>
              {jobs.length > 0 ? (
                <ul className="grid gap-x-8 gap-y-10 md:grid-cols-2 xl:grid-cols-3">
                  {jobs.map((result, index) => (
                    <li key={result.id}>
                      <JobCard result={result} index={index} />
                    </li>
                  ))}
                </ul>
              ) : null}
              {jobs.length < 6 ? (
                <EmptyNote>
                  {jobs.length === 0 ? 'No job listings in that window.' : 'Only a few listings match right now.'} LinkedIn
                  matches titles closely, so try a wider window, a shorter role (&ldquo;software intern&rdquo; instead of
                  &ldquo;React frontend intern&rdquo;), or the whole country instead of one city.
                </EmptyNote>
              ) : null}
            </section>

            <section className="space-y-8" aria-labelledby="posts-heading">
              <div id="posts-heading">
                <SectionHeading
                  title="Hiring posts from people"
                  count={posts.length}
                  note="Someone is hiring and you can reply or message them directly."
                />
              </div>
              {posts.length > 0 ? (
                <ul className="grid gap-x-8 gap-y-12 md:grid-cols-2 xl:grid-cols-3">
                  {posts.map((result, index) => (
                    <li key={result.id}>
                      <PostCard result={result} index={index} />
                    </li>
                  ))}
                </ul>
              ) : (
                <EmptyNote>
                  No hiring posts in that window. People&apos;s posts reach our search index in batches, so the 7 or 30 day
                  window usually has more.
                </EmptyNote>
              )}
            </section>
          </>
        ) : null}

        {!isLoading && !responseData && !error ? (
          <div className="flex items-center gap-4 text-board-muted">
            <Briefcase className="h-5 w-5 text-board-ink" aria-hidden="true" />
            <PinTag className="text-xl text-board-ink">Nothing pinned yet.</PinTag>
            <span>Try one of the example searches above.</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
