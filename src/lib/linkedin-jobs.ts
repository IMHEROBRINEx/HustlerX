const GUEST_SEARCH_URL = 'https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search';
const PAGE_SIZE = 10;
const MAX_PAGES = 5;
const REQUEST_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36',
  'Accept-Language': 'en-US,en;q=0.9',
  Accept: 'text/html,application/xhtml+xml',
};

export interface LinkedInJob {
  id: string;
  title: string;
  company?: string;
  location?: string;
  url: string;
  postedAt?: string;
  postedText?: string;
  logoUrl?: string;
  salary?: string;
  benefit?: string;
}

export interface LinkedInJobSearchOptions {
  keywords: string;
  location: string;
  maxAgeSeconds: number;
  remoteOnly?: boolean;
  nowDate?: Date;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

function decodeHtml(value: string): string {
  return value
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match)
    .replace(/\s+/g, ' ')
    .trim();
}

function firstMatch(html: string, pattern: RegExp): string | undefined {
  const match = html.match(pattern);
  return match?.[1] ? decodeHtml(match[1].replace(/<[^>]+>/g, ' ')) || undefined : undefined;
}

function relativeToIso(text: string | undefined, fallbackDate: string | undefined, nowDate: Date): string | undefined {
  const match = text?.match(/(\d+)\s*(minute|min|hour|hr|day|week|month)s?\s+ago/i);
  if (match) {
    const quantity = Number(match[1]);
    const unit = match[2].toLowerCase();
    const minute = 60 * 1000;
    const unitMs =
      unit.startsWith('min') ? minute
      : unit.startsWith('h') ? 60 * minute
      : unit === 'day' ? 24 * 60 * minute
      : unit === 'week' ? 7 * 24 * 60 * minute
      : 30 * 24 * 60 * minute;
    return new Date(nowDate.getTime() - quantity * unitMs).toISOString();
  }
  if (fallbackDate) {
    const parsed = new Date(fallbackDate);
    if (!Number.isNaN(parsed.valueOf())) return parsed.toISOString();
  }
  return undefined;
}

function parseCards(html: string, nowDate: Date): LinkedInJob[] {
  const jobs: LinkedInJob[] = [];
  for (const card of html.match(/<li>[\s\S]*?<\/li>/g) ?? []) {
    const id = card.match(/urn:li:jobPosting:(\d+)/)?.[1];
    const rawUrl = card.match(/class="base-card__full-link[^"]*"\s+href="([^"]+)"/)?.[1];
    const title = firstMatch(card, /<h3 class="base-search-card__title">([\s\S]*?)<\/h3>/);
    if (!id || !title) continue;

    const url = rawUrl ? decodeHtml(rawUrl).split('?')[0] : `https://www.linkedin.com/jobs/view/${id}`;
    const timeMatch = card.match(/<time[^>]*datetime="([^"]+)"[^>]*>([\s\S]*?)<\/time>/);
    const postedText = timeMatch ? decodeHtml(timeMatch[2]) : undefined;

    jobs.push({
      id,
      title,
      company: firstMatch(card, /<h4 class="base-search-card__subtitle">([\s\S]*?)<\/h4>/),
      location: firstMatch(card, /<span class="job-search-card__location">([\s\S]*?)<\/span>/),
      url,
      postedAt: relativeToIso(postedText, timeMatch?.[1], nowDate),
      postedText,
      logoUrl: card.match(/data-delayed-url="([^"]+)"/)?.[1]?.replace(/&amp;/g, '&'),
      salary: firstMatch(card, /<span class="job-search-card__salary-info">([\s\S]*?)<\/span>/),
      benefit: firstMatch(card, /<span class="job-posting-benefits__text">([\s\S]*?)<\/span>/),
    });
  }
  return jobs;
}

export async function searchLinkedInJobs(
  options: LinkedInJobSearchOptions,
): Promise<{ jobs: LinkedInJob[]; error?: string }> {
  const nowDate = options.nowDate ?? new Date();
  const jobs: LinkedInJob[] = [];
  const seen = new Set<string>();

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const params = new URLSearchParams({
      keywords: options.keywords,
      location: options.location,
      f_TPR: `r${Math.max(3600, Math.round(options.maxAgeSeconds))}`,
      sortBy: 'DD',
      start: String(page * PAGE_SIZE),
    });
    if (options.remoteOnly) params.set('f_WT', '2');

    let response: Response;
    try {
      response = await fetch(`${GUEST_SEARCH_URL}?${params}`, { headers: REQUEST_HEADERS, cache: 'no-store' });
    } catch (error) {
      if (jobs.length > 0) break;
      return { jobs, error: error instanceof Error ? error.message : 'network error' };
    }

    if (!response.ok) {
      if (jobs.length > 0) break;
      return { jobs, error: response.status === 429 ? 'LinkedIn is rate-limiting requests' : `LinkedIn returned ${response.status}` };
    }

    const pageJobs = parseCards(await response.text(), nowDate);
    for (const job of pageJobs) {
      if (seen.has(job.id)) continue;
      seen.add(job.id);
      jobs.push(job);
    }
    if (pageJobs.length < PAGE_SIZE) break;
  }

  return { jobs };
}
