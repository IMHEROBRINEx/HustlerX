// Mirrors /api/exa/job-posts: fresh LinkedIn hiring posts + job listings for a window.
// Usage: node scripts/exa-freshness-check.mjs "frontend internships in Bengaluru" [days]
process.loadEnvFile('.env.local');

const apiKey = process.env.EXA_API_KEY;
if (!apiKey) {
  console.error('EXA_API_KEY is missing from .env.local');
  process.exit(1);
}

const query = process.argv[2] || 'software engineering internships in India';
const days = Number(process.argv[3] || 7);
const now = Date.now();
const startPublishedDate = new Date(now - days * 86400000).toISOString();

const SOURCES = {
  posts: {
    query: `LinkedIn post: we're hiring — ${query}`,
    numResults: 40,
    includeDomains: ['linkedin.com/posts', 'linkedin.com/feed/update'],
  },
  jobs: { query, numResults: 30, includeDomains: ['linkedin.com/jobs/view'] },
};

for (const [label, source] of Object.entries(SOURCES)) {
  const response = await fetch('https://api.exa.ai/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey },
    body: JSON.stringify({ ...source, startPublishedDate, contents: { highlights: { maxCharacters: 1200 } } }),
  });
  const data = await response.json();
  if (!response.ok) {
    console.log(`${label}: HTTP ${response.status}`, JSON.stringify(data).slice(0, 200));
    continue;
  }
  const results = (data.results ?? [])
    .map((r) => ({ ...r, ageDays: r.publishedDate ? (now - Date.parse(r.publishedDate)) / 86400000 : Infinity }))
    .sort((a, b) => a.ageDays - b.ageDays);
  const under2 = results.filter((r) => r.ageDays <= 2).length;
  console.log(`\n${label}: ${results.length} results in last ${days}d, ${under2} under 2 days old (cost $${data.costDollars?.total ?? '?'})`);
  for (const r of results.slice(0, 5)) {
    console.log(`   [${r.ageDays.toFixed(1)}d] ${(r.title || '').replace(/\s+/g, ' ').slice(0, 90)}`);
  }
}
