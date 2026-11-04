import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-user';
import { parseVariablePayload } from '@/lib/exa-people-normalizer';
import { searchLinkedInJobs, type LinkedInJob } from '@/lib/linkedin-jobs';

export const runtime = 'nodejs';

const EXA_API_BASE = 'https://api.exa.ai';

type ConnectionDegree = 1 | 2;

type DurationUnit = 'hour' | 'day' | 'week' | 'month';

type ResultKind = 'post' | 'job';

interface JobPostSearchResult {
  id: string;
  kind: ResultKind;
  title: string;
  url: string;
  snippet: string;
  connectionDegree: ConnectionDegree | null;
  degreeEvidence?: string;
  publishedDate?: string;
  author?: string;
  company?: string;
  location?: string;
  logoUrl?: string;
  score?: number;
}

interface DetectedTimeWindow {
  phrase: string;
  maxAgeMs: number;
  cutoffIso: string;
}

interface JobPostsSearchRequestBody {
  query?: string;
  maxAgeDays?: number;
}

const ALLOWED_MAX_AGE_DAYS = [1, 3, 7, 30];
const DEFAULT_MAX_AGE_DAYS = 7;
const POSTS_PER_SEARCH = 50;
const JOBS_PER_SEARCH = 40;
const RECENT_TIER_MS = 2 * 24 * 60 * 60 * 1000;

const SOURCES: Record<ResultKind, { includeDomains: string[]; urlPattern: RegExp; numResults: number }> = {
  post: {
    includeDomains: ['linkedin.com/posts', 'linkedin.com/feed/update'],
    urlPattern: /linkedin\.com\/(posts|feed\/update)\//i,
    numResults: POSTS_PER_SEARCH,
  },
  job: {
    includeDomains: ['linkedin.com/jobs/view'],
    urlPattern: /linkedin\.com\/jobs\/view\//i,
    numResults: JOBS_PER_SEARCH,
  },
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function getString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function getNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return undefined;
}

function clampInteger(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

function compactText(value: string, maxLength: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function parseDurationQuantity(token: string): number | null {
  const normalized = token.toLowerCase().trim().replace(/[^a-z0-9-]/g, '').replace(/-/g, '');
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized);
  if (Number.isFinite(parsed) && parsed > 0) {
    return Math.trunc(parsed);
  }

  const wordMap: Record<string, number> = {
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
    seventeen: 17,
    eighteen: 18,
    nineteen: 19,
    twenty: 20,
    twentyfour: 24,
  };

  return wordMap[normalized] ?? null;
}

function normalizeDurationUnit(token: string): DurationUnit | null {
  const normalized = token.toLowerCase().trim();

  if (normalized === 'h' || normalized === 'hr' || normalized === 'hrs' || normalized.startsWith('hour')) {
    return 'hour';
  }

  if (normalized === 'd' || normalized.startsWith('day')) {
    return 'day';
  }

  if (normalized === 'w' || normalized.startsWith('week')) {
    return 'week';
  }

  if (normalized.startsWith('month')) {
    return 'month';
  }

  return null;
}

function durationToMilliseconds(quantity: number, unit: DurationUnit): number {
  const hourMs = 60 * 60 * 1000;

  if (unit === 'hour') return quantity * hourMs;
  if (unit === 'day') return quantity * 24 * hourMs;
  if (unit === 'week') return quantity * 7 * 24 * hourMs;

  return quantity * 30 * 24 * hourMs;
}

function getStartOfWeek(nowDate: Date): Date {
  const start = new Date(nowDate);
  const day = start.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function detectTimeWindowFromQuery(query: string, nowDate: Date): DetectedTimeWindow | null {
  const candidates: Array<{ phrase: string; maxAgeMs: number }> = [];
  const nowMs = nowDate.getTime();

  const addCandidate = (phrase: string, maxAgeMs: number) => {
    if (!Number.isFinite(maxAgeMs) || maxAgeMs <= 0) {
      return;
    }

    candidates.push({
      phrase: compactText(phrase, 80),
      maxAgeMs,
    });
  };

  const quantityUnitPattern =
    /\b(?:within|in|last|past)\s+([a-z0-9-]+)\s*(hours?|hrs?|hr|h|days?|d|weeks?|w|months?)\b/gi;
  for (const match of query.matchAll(quantityUnitPattern)) {
    const quantity = parseDurationQuantity(match[1] || '');
    const unit = normalizeDurationUnit(match[2] || '');

    if (!quantity || !unit) {
      continue;
    }

    addCandidate(match[0], durationToMilliseconds(quantity, unit));
  }

  const agoPattern = /\b([a-z0-9-]+)\s*(hours?|hrs?|hr|h|days?|d|weeks?|w|months?)\s+ago\b/gi;
  for (const match of query.matchAll(agoPattern)) {
    const quantity = parseDurationQuantity(match[1] || '');
    const unit = normalizeDurationUnit(match[2] || '');

    if (!quantity || !unit) {
      continue;
    }

    addCandidate(match[0], durationToMilliseconds(quantity, unit));
  }

  if (/\btoday\b/i.test(query)) {
    const start = new Date(nowDate);
    start.setHours(0, 0, 0, 0);
    addCandidate('today', nowMs - start.getTime());
  }

  if (/\byesterday\b/i.test(query)) {
    const start = new Date(nowDate);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    addCandidate('yesterday', nowMs - start.getTime());
  }

  if (/\bthis\s+week\b/i.test(query)) {
    const start = getStartOfWeek(nowDate);
    addCandidate('this week', nowMs - start.getTime());
  }

  if (/\blast\s+week\b/i.test(query)) {
    addCandidate('last week', durationToMilliseconds(7, 'day'));
  }

  if (/\bthis\s+month\b/i.test(query)) {
    const start = new Date(nowDate.getFullYear(), nowDate.getMonth(), 1);
    addCandidate('this month', nowMs - start.getTime());
  }

  if (candidates.length === 0) {
    return null;
  }

  const strictest = candidates.reduce((best, current) => {
    if (!best) return current;
    return current.maxAgeMs < best.maxAgeMs ? current : best;
  }, candidates[0]);

  return {
    phrase: strictest.phrase,
    maxAgeMs: strictest.maxAgeMs,
    cutoffIso: new Date(nowMs - strictest.maxAgeMs).toISOString(),
  };
}

function parsePublishedDateText(value: string, nowDate: Date): Date | null {
  const directDate = new Date(value);
  if (!Number.isNaN(directDate.valueOf())) {
    return directDate;
  }

  const agoMatch = value.match(/\b([a-z0-9-]+)\s*(hours?|hrs?|hr|h|days?|d|weeks?|w|months?)\s+ago\b/i);
  if (agoMatch) {
    const quantity = parseDurationQuantity(agoMatch[1] || '');
    const unit = normalizeDurationUnit(agoMatch[2] || '');

    if (quantity && unit) {
      return new Date(nowDate.getTime() - durationToMilliseconds(quantity, unit));
    }
  }

  if (/\btoday\b/i.test(value)) {
    const date = new Date(nowDate);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  if (/\byesterday\b/i.test(value)) {
    const date = new Date(nowDate);
    date.setDate(date.getDate() - 1);
    date.setHours(0, 0, 0, 0);
    return date;
  }

  return null;
}

function getPublishedDateFromRecord(record: Record<string, unknown>, nowDate: Date): { display?: string; parsed: Date | null } {
  const metadata = asRecord(record.metadata);

  const textCandidates = [
    getString(record.publishedDate),
    getString(record.published_date),
    getString(record.date),
    getString(record.published),
    getString(record.createdAt),
    getString(record.created_at),
    getString(metadata.publishedDate),
    getString(metadata.date),
  ].filter((value): value is string => Boolean(value));

  for (const candidate of textCandidates) {
    const parsed = parsePublishedDateText(candidate, nowDate);
    if (parsed) {
      return {
        display: parsed.toISOString(),
        parsed,
      };
    }
  }

  const numericCandidates = [
    getNumber(record.publishedAt),
    getNumber(record.published_at),
    getNumber(record.createdAt),
    getNumber(record.created_at),
    getNumber(metadata.publishedAt),
  ].filter((value): value is number => Number.isFinite(value));

  for (const numeric of numericCandidates) {
    const epochMs = numeric > 1_000_000_000_000 ? numeric : numeric * 1000;
    const parsed = new Date(epochMs);
    if (!Number.isNaN(parsed.valueOf())) {
      return {
        display: parsed.toISOString(),
        parsed,
      };
    }
  }

  const fallbackDisplay = textCandidates[0];
  return {
    display: fallbackDisplay,
    parsed: fallbackDisplay ? parsePublishedDateText(fallbackDisplay, nowDate) : null,
  };
}

function findResultArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  const root = asRecord(payload);
  if (Array.isArray(root.results)) {
    return root.results;
  }

  const containers = ['data', 'response', 'payload', 'output', 'result'];
  for (const key of containers) {
    const value = root[key];
    if (Array.isArray(value)) {
      return value;
    }

    const nested = asRecord(value);
    if (Array.isArray(nested.results)) {
      return nested.results;
    }
  }

  return [];
}

function parseExplicitDegreeValue(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.toLowerCase().trim();
  if (!normalized) return undefined;

  if (normalized.includes('1st') || normalized.includes('first')) return 1;
  if (normalized.includes('2nd') || normalized.includes('second')) return 2;
  if (normalized.includes('3rd') || normalized.includes('third')) return 3;

  const numericMatch = normalized.match(/\b([1-3])\b/);
  if (!numericMatch) return undefined;

  return Number(numericMatch[1]);
}

function readExplicitDegree(value: unknown, depth: number = 0): number | undefined {
  if (depth > 4 || value == null) {
    return undefined;
  }

  const direct = parseExplicitDegreeValue(value);
  if (direct !== undefined) {
    return direct;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const nested = readExplicitDegree(item, depth + 1);
      if (nested !== undefined) {
        return nested;
      }
    }
    return undefined;
  }

  const record = asRecord(value);
  for (const [key, child] of Object.entries(record)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('degree') ||
      lowerKey.includes('connection') ||
      lowerKey.includes('distance') ||
      lowerKey.includes('network') ||
      lowerKey.includes('relationship')
    ) {
      const matched = parseExplicitDegreeValue(child);
      if (matched !== undefined) {
        return matched;
      }
    }
  }

  for (const child of Object.values(record)) {
    const nested = readExplicitDegree(child, depth + 1);
    if (nested !== undefined) {
      return nested;
    }
  }

  return undefined;
}

function detectDegreeFromText(text: string): { degree: number | null; evidence?: string } {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return { degree: null };
  }

  const checks: Array<{ degree: number; regexes: RegExp[] }> = [
    {
      degree: 1,
      regexes: [
        /\b(?:1st|first)\s*(?:[- ]*degree)?\s*connection(?:s)?\b/i,
        /\b(?:1st|first)\s*degree\b/i,
      ],
    },
    {
      degree: 2,
      regexes: [
        /\b(?:2nd|second)\s*(?:[- ]*degree)?\s*connection(?:s)?\b/i,
        /\b(?:2nd|second)\s*degree\b/i,
      ],
    },
  ];

  for (const check of checks) {
    for (const regex of check.regexes) {
      const match = normalized.match(regex);
      if (match) {
        return {
          degree: check.degree,
          evidence: compactText(match[0], 80),
        };
      }
    }
  }

  return { degree: null };
}

function findConnectionDegree(record: Record<string, unknown>): { degree: ConnectionDegree | null; evidence?: string } {
  const explicitDegree = readExplicitDegree(record);
  if (explicitDegree === 1 || explicitDegree === 2) {
    return {
      degree: explicitDegree,
      evidence: `${explicitDegree === 1 ? '1st' : '2nd'} degree metadata`,
    };
  }

  const textCandidates: string[] = [];

  const title = getString(record.title);
  const snippet = getString(record.snippet);
  const text = getString(record.text);
  const url = getString(record.url);
  const author = getString(record.author);

  if (title) textCandidates.push(title);
  if (snippet) textCandidates.push(snippet);
  if (text) textCandidates.push(text);
  if (url) textCandidates.push(url);
  if (author) textCandidates.push(author);

  asArray(record.highlights)
    .map((item) => getString(item))
    .forEach((item) => {
      if (item) textCandidates.push(item);
    });

  for (const candidateText of textCandidates) {
    const detected = detectDegreeFromText(candidateText);
    if (detected.degree === 1 || detected.degree === 2) {
      return {
        degree: detected.degree,
        evidence: detected.evidence,
      };
    }
  }

  return { degree: null };
}

function buildSnippet(record: Record<string, unknown>): string {
  const highlight = asArray(record.highlights)
    .map((item) => getString(item))
    .find((item): item is string => Boolean(item));

  const snippet = highlight || getString(record.snippet) || getString(record.text) || 'No preview available.';
  return compactText(snippet, 420);
}

const DEGREE_PHRASE_PATTERN =
  /\b(?:from|by|among|in)?\s*(?:my\s+)?(?:1st|first|2nd|second)(?:\s*(?:or|and|\/|,)\s*(?:1st|first|2nd|second))?[- ]*degree(?:\s+connections?)?\b/gi;

function buildSearchQuery(naturalLanguageQuery: string, timeWindow: DetectedTimeWindow | null): string {
  let cleaned = naturalLanguageQuery.replace(DEGREE_PHRASE_PATTERN, ' ');
  if (timeWindow) {
    cleaned = cleaned.split(timeWindow.phrase).join(' ');
  }
  cleaned = cleaned
    .replace(/\bposted\b/gi, ' ')
    .replace(/\b(?:connections?|network)\b/gi, ' ')
    .replace(/\b(?:in|within|from|during|over)\s+(?:the\s+)?(?=\s*(?:[,.;]|$))/gi, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.;:-]+|[\s,.;:-]+$/g, '')
    .trim();
  return cleaned || naturalLanguageQuery;
}

const QUERY_STOPWORDS = new Set([
  'a', 'an', 'and', 'at', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with', 'that', 'which', 'who',
  'mention', 'mentions', 'mentioning', 'my', 'me', 'i', 'want', 'looking', 'find', 'show', 'any', 'some', 'new',
  'job', 'jobs', 'role', 'roles', 'position', 'positions', 'opening', 'openings', 'hiring', 'post', 'posts',
  'opportunity', 'opportunities', 'company', 'companies', 'startup', 'startups', 'based', 'near',
]);

const INDIAN_CITIES = [
  'bengaluru', 'bangalore', 'mumbai', 'bombay', 'delhi', 'ncr', 'noida', 'gurugram', 'gurgaon', 'hyderabad', 'pune',
  'chennai', 'kolkata', 'ahmedabad', 'jaipur', 'kochi', 'chandigarh', 'indore', 'coimbatore', 'mysuru', 'mysore',
  'thiruvananthapuram', 'bhubaneswar', 'lucknow', 'nagpur', 'goa', 'karnataka', 'maharashtra', 'telangana', 'tamil nadu',
];

const LOCATION_ALIASES: Record<string, string[]> = {
  india: ['india', ...INDIAN_CITIES],
  bengaluru: ['bengaluru', 'bangalore'],
  bangalore: ['bengaluru', 'bangalore'],
  mumbai: ['mumbai', 'bombay'],
  delhi: ['delhi', 'ncr', 'noida', 'gurugram', 'gurgaon'],
  ncr: ['delhi', 'ncr', 'noida', 'gurugram', 'gurgaon'],
  noida: ['noida'],
  gurugram: ['gurugram', 'gurgaon'],
  gurgaon: ['gurugram', 'gurgaon'],
  hyderabad: ['hyderabad'],
  pune: ['pune'],
  chennai: ['chennai', 'madras'],
  kolkata: ['kolkata', 'calcutta'],
  ahmedabad: ['ahmedabad'],
  jaipur: ['jaipur'],
  kochi: ['kochi', 'cochin'],
  remote: ['remote', 'work from home', 'wfh', 'anywhere'],
  usa: ['united states', 'usa', ', us'],
  uk: ['united kingdom', 'uk', 'london'],
  london: ['london'],
  singapore: ['singapore'],
  dubai: ['dubai', 'uae'],
  canada: ['canada', 'toronto', 'vancouver'],
  germany: ['germany', 'berlin', 'munich'],
};

const HIRING_INTENT = /\b(hiring|we'?re hiring|intern(ship)?s?|opening|vacanc|position|role|apply|join (our|the) team|looking for|job|recruit|opportunit)/i;

interface QueryTerms {
  topics: string[];
  places: string[][];
}

function queryTerms(cleanedQuery: string): QueryTerms {
  const seen = new Set<string>();
  const topics: string[] = [];
  const places: string[][] = [];
  for (const raw of cleanedQuery.toLowerCase().split(/[^a-z0-9+#]+/)) {
    if (raw.length < 2 || QUERY_STOPWORDS.has(raw) || seen.has(raw)) continue;
    seen.add(raw);
    if (LOCATION_ALIASES[raw]) {
      places.push(LOCATION_ALIASES[raw]);
      continue;
    }
    const stem = raw.startsWith('intern') ? 'intern' : raw.length > 4 && raw.endsWith('s') ? raw.slice(0, -1) : raw;
    if (!topics.includes(stem)) topics.push(stem);
  }
  return { topics, places };
}

function isRelevant(result: JobPostSearchResult, terms: QueryTerms): boolean {
  const text = [result.title, result.snippet, result.company, result.location].filter(Boolean).join(' ').toLowerCase();
  if (result.kind === 'post' && !HIRING_INTENT.test(text)) return false;

  if (terms.places.length > 0) {
    const placeText = result.kind === 'job' && result.location ? result.location.toLowerCase() : text;
    if (!terms.places.some((variants) => variants.some((place) => placeText.includes(place)))) return false;
  }

  if (terms.topics.length === 0) return true;
  const squashed = text.replace(/[\s-]+/g, '');
  const matched = terms.topics.filter((term) => text.includes(term) || squashed.includes(term)).length;
  const needed = terms.topics.length <= 2 ? terms.topics.length : Math.ceil((terms.topics.length * 2) / 3);
  return matched >= needed;
}

function parseJobListingTitle(rawTitle: string): { title: string; company?: string; location?: string } {
  const withoutSuffix = rawTitle.replace(/\s*\|\s*LinkedIn.*$/i, '').trim();
  const [head, ...locationParts] = withoutSuffix.split(/\s+[—–]\s+/);
  const location = locationParts.join(' — ').trim() || undefined;
  const atIndex = head.lastIndexOf(' at ');
  if (atIndex > 0) {
    return { title: head.slice(0, atIndex).trim(), company: head.slice(atIndex + 4).trim(), location };
  }
  return { title: head.trim(), location };
}

function normalizeResult(item: unknown, index: number, nowDate: Date, kind: ResultKind): JobPostSearchResult | null {
  const record = asRecord(item);
  const url = getString(record.url);
  if (!url || !SOURCES[kind].urlPattern.test(url)) {
    return null;
  }

  const { degree, evidence } = findConnectionDegree(record);
  const rawTitle = getString(record.title) || (kind === 'job' ? `LinkedIn job ${index + 1}` : `LinkedIn post ${index + 1}`);
  const published = getPublishedDateFromRecord(record, nowDate);
  const listing = kind === 'job' ? parseJobListingTitle(rawTitle) : null;

  return {
    id: getString(record.id) || `${url}-${index + 1}`,
    kind,
    title: compactText(listing?.title || rawTitle, 160),
    url,
    snippet: buildSnippet(record),
    connectionDegree: degree,
    degreeEvidence: degree ? evidence : undefined,
    publishedDate: published.display,
    author: kind === 'post' ? getString(record.author) : undefined,
    company: listing?.company,
    location: listing?.location,
    score: getNumber(record.score),
  };
}

async function searchExa(
  apiKey: string,
  kind: ResultKind,
  query: string,
  startPublishedDate: string,
): Promise<{ results: unknown[]; error?: string }> {
  const source = SOURCES[kind];
  const response = await fetch(`${EXA_API_BASE}/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
    },
    body: JSON.stringify({
      query: kind === 'post' ? `LinkedIn post: we're hiring — ${query}` : query,
      numResults: source.numResults,
      includeDomains: source.includeDomains,
      startPublishedDate,
      contents: {
        highlights: {
          maxCharacters: kind === 'post' ? 2000 : 1200,
        },
      },
    }),
  });

  const payload = parseVariablePayload(await response.text());
  if (!response.ok) {
    const message = getString(asRecord(payload).error) || `status ${response.status}`;
    return { results: [], error: message };
  }
  return { results: findResultArray(payload) };
}

function freshAndSorted(
  results: JobPostSearchResult[],
  cutoffMs: number,
  nowDate: Date,
  terms: QueryTerms,
): { kept: JobPostSearchResult[]; droppedOld: number; droppedUndated: number; droppedOffTopic: number } {
  let droppedOld = 0;
  let droppedUndated = 0;
  let droppedOffTopic = 0;
  const seen = new Set<string>();
  const dated: Array<{ item: JobPostSearchResult; time: number }> = [];

  for (const item of results) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);

    if (!isRelevant(item, terms)) {
      droppedOffTopic += 1;
      continue;
    }

    const parsed = item.publishedDate ? parsePublishedDateText(item.publishedDate, nowDate) : null;
    if (!parsed) {
      droppedUndated += 1;
      continue;
    }
    if (parsed.getTime() < cutoffMs) {
      droppedOld += 1;
      continue;
    }
    dated.push({ item, time: parsed.getTime() });
  }

  dated.sort((a, b) => b.time - a.time);
  return { kept: dated.map((entry) => entry.item), droppedOld, droppedUndated, droppedOffTopic };
}

const LINKEDIN_LOCATIONS: Record<string, string> = {
  india: 'India',
  bengaluru: 'Bengaluru, Karnataka, India',
  bangalore: 'Bengaluru, Karnataka, India',
  mumbai: 'Mumbai, Maharashtra, India',
  delhi: 'Delhi, India',
  ncr: 'Delhi, India',
  noida: 'Noida, Uttar Pradesh, India',
  gurugram: 'Gurugram, Haryana, India',
  gurgaon: 'Gurugram, Haryana, India',
  hyderabad: 'Hyderabad, Telangana, India',
  pune: 'Pune, Maharashtra, India',
  chennai: 'Chennai, Tamil Nadu, India',
  kolkata: 'Kolkata, West Bengal, India',
  ahmedabad: 'Ahmedabad, Gujarat, India',
  jaipur: 'Jaipur, Rajasthan, India',
  kochi: 'Kochi, Kerala, India',
  usa: 'United States',
  uk: 'United Kingdom',
  london: 'London, England, United Kingdom',
  singapore: 'Singapore',
  dubai: 'Dubai, United Arab Emirates',
  canada: 'Canada',
  germany: 'Germany',
};
const DEFAULT_LINKEDIN_LOCATION = 'India';
const LINKEDIN_KEYWORD_STOPWORDS = new Set([
  'a', 'an', 'and', 'at', 'for', 'from', 'in', 'of', 'on', 'or', 'the', 'to', 'with', 'that', 'which', 'who',
  'mention', 'mentions', 'mentioning', 'my', 'me', 'i', 'want', 'looking', 'find', 'show', 'any', 'some', 'near',
  'based', 'company', 'companies', 'startup', 'startups', 'post', 'posts', 'job', 'jobs', 'opening', 'openings',
]);

function linkedInSearchFor(cleanedQuery: string): { keywords: string; location: string; remoteOnly: boolean } {
  let location: string | undefined;
  let remoteOnly = false;
  const keywords: string[] = [];
  for (const word of cleanedQuery.split(/\s+/)) {
    const key = word.toLowerCase().replace(/[^a-z0-9+#]/g, '');
    if (!key) continue;
    if (LINKEDIN_LOCATIONS[key]) {
      if (!location || location === 'India') location = LINKEDIN_LOCATIONS[key];
      continue;
    }
    if (key === 'remote' || key === 'wfh') {
      remoteOnly = true;
      continue;
    }
    if (LINKEDIN_KEYWORD_STOPWORDS.has(key)) continue;
    keywords.push(word.replace(/[,.;:]+$/, ''));
  }
  return { keywords: keywords.join(' ') || cleanedQuery, location: location ?? DEFAULT_LINKEDIN_LOCATION, remoteOnly };
}

function linkedInJobToResult(job: LinkedInJob): JobPostSearchResult {
  return {
    id: `li-${job.id}`,
    kind: 'job',
    title: job.title,
    url: job.url,
    snippet: [job.salary, job.benefit].filter(Boolean).join(' · '),
    connectionDegree: null,
    publishedDate: job.postedAt,
    company: job.company,
    location: job.location,
    logoUrl: job.logoUrl,
  };
}

function relevantLinkedInJobs(jobs: LinkedInJob[], terms: QueryTerms): { kept: JobPostSearchResult[]; droppedOffTopic: number } {
  const kept: JobPostSearchResult[] = [];
  const seen = new Set<string>();
  let droppedOffTopic = 0;
  for (const job of jobs) {
    const listingKey = [job.title, job.company, job.location].join('|').toLowerCase();
    if (seen.has(listingKey)) continue;
    seen.add(listingKey);

    const title = job.title.toLowerCase();
    const squashed = title.replace(/[\s-]+/g, '');
    const onTopic =
      terms.topics.length === 0 || terms.topics.some((term) => title.includes(term) || squashed.includes(term));
    if (onTopic) kept.push(linkedInJobToResult(job));
    else droppedOffTopic += 1;
  }
  kept.sort((a, b) => (Date.parse(b.publishedDate ?? '') || 0) - (Date.parse(a.publishedDate ?? '') || 0));
  return { kept, droppedOffTopic };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as JobPostsSearchRequestBody;
    const query = typeof body.query === 'string' ? body.query.trim() : '';

    if (!query) {
      return NextResponse.json({ success: false, error: 'Query is required' }, { status: 400 });
    }

    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: 'EXA_API_KEY is not configured' }, { status: 500 });
    }

    const nowDate = new Date();
    const requestedDays = Number(body.maxAgeDays);
    const pickerDays = ALLOWED_MAX_AGE_DAYS.includes(requestedDays) ? requestedDays : DEFAULT_MAX_AGE_DAYS;
    const timeWindow = detectTimeWindowFromQuery(query, nowDate);
    const cutoffIso = timeWindow?.cutoffIso ?? new Date(nowDate.getTime() - pickerDays * 24 * 60 * 60 * 1000).toISOString();
    const cutoffMs = new Date(cutoffIso).getTime();
    const exaQuery = buildSearchQuery(query, timeWindow);

    const recentCutoffIso = new Date(nowDate.getTime() - RECENT_TIER_MS).toISOString();
    const wantsRecentTier = cutoffMs < nowDate.getTime() - RECENT_TIER_MS;

    const linkedInSearch = linkedInSearchFor(exaQuery);

    const [postSearch, recentPostSearch, linkedInJobs] = await Promise.all([
      searchExa(apiKey, 'post', exaQuery, cutoffIso),
      wantsRecentTier ? searchExa(apiKey, 'post', exaQuery, recentCutoffIso) : Promise.resolve({ results: [] as unknown[] }),
      searchLinkedInJobs({
        ...linkedInSearch,
        maxAgeSeconds: (nowDate.getTime() - cutoffMs) / 1000,
        nowDate,
      }),
    ]);
    postSearch.results = [...recentPostSearch.results, ...postSearch.results];

    const normalize = (items: unknown[], kind: ResultKind) =>
      items
        .map((item, index) => normalizeResult(item, index, nowDate, kind))
        .filter((item): item is JobPostSearchResult => Boolean(item));

    const terms = queryTerms(exaQuery);
    const posts = freshAndSorted(normalize(postSearch.results, 'post'), cutoffMs, nowDate, terms);

    let jobs: { kept: JobPostSearchResult[]; droppedOld: number; droppedUndated: number; droppedOffTopic: number };
    let jobsExamined = linkedInJobs.jobs.length;
    let jobsSource: 'linkedin' | 'exa' = 'linkedin';
    let jobsError: string | undefined;

    if (linkedInJobs.error) {
      const fallback = await searchExa(apiKey, 'job', exaQuery, cutoffIso);
      jobs = freshAndSorted(normalize(fallback.results, 'job'), cutoffMs, nowDate, terms);
      jobsExamined = fallback.results.length;
      jobsSource = 'exa';
      jobsError = fallback.error ? `${linkedInJobs.error}; backup search failed too (${fallback.error})` : undefined;
    } else {
      jobs = { ...relevantLinkedInJobs(linkedInJobs.jobs, terms), droppedOld: 0, droppedUndated: 0 };
    }

    if (postSearch.error && jobsError) {
      return NextResponse.json({ success: false, error: `Search failed: ${postSearch.error}` }, { status: 502 });
    }

    const warnings: string[] = [];
    if (postSearch.error) warnings.push(`Hiring posts couldn\u2019t be loaded this time (${postSearch.error}).`);
    if (jobsError) warnings.push(`Job listings couldn\u2019t be loaded this time (${jobsError}).`);
    else if (jobsSource === 'exa') {
      warnings.push(`LinkedIn didn\u2019t answer (${linkedInJobs.error}), so job listings come from a slower backup index.`);
    }

    return NextResponse.json({
      success: true,
      query,
      appliedQuery: exaQuery,
      freshness: {
        source: timeWindow ? 'query' : 'picker',
        label: timeWindow ? timeWindow.phrase : `last ${pickerDays === 1 ? '24 hours' : `${pickerDays} days`}`,
        maxAgeDays: timeWindow ? undefined : pickerDays,
        cutoffIso,
      },
      posts: posts.kept,
      jobs: jobs.kept,
      jobsSearch: { source: jobsSource, ...linkedInSearch },
      counts: {
        postsExamined: postSearch.results.length,
        jobsExamined,
        droppedOld: posts.droppedOld + jobs.droppedOld,
        droppedUndated: posts.droppedUndated + jobs.droppedUndated,
        droppedOffTopic: posts.droppedOffTopic + jobs.droppedOffTopic,
      },
      warnings,
    });
  } catch (error) {
    console.error('Job post search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: `Job post search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 },
    );
  }
}
