// Runs the real /api/exa/job-posts handler outside Next, with auth stubbed.
// Usage: node scripts/job-search-harness.mjs "frontend internships in Bengaluru" [days]
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

process.loadEnvFile('.env.local');

const root = pathToFileURL(process.cwd() + '/').href;
const stubs = {
  'next/server':
    'export const NextResponse = { json: (body, init) => ({ body, status: init?.status ?? 200 }) }; export class NextRequest {}',
  '@/lib/auth-user': "export async function getAuthenticatedUser() { return { id: 'harness' }; }",
};

register(
  'data:text/javascript,' +
    encodeURIComponent(`
      const stubs = ${JSON.stringify(stubs)};
      const root = ${JSON.stringify(root)};
      export async function resolve(specifier, context, next) {
        if (stubs[specifier]) return { url: 'data:text/javascript,' + encodeURIComponent(stubs[specifier]), shortCircuit: true };
        if (specifier.startsWith('@/')) return { url: new URL('src/' + specifier.slice(2) + '.ts', root).href, shortCircuit: true };
        return next(specifier, context);
      }
    `),
);

const { POST } = await import(new URL('src/app/api/exa/job-posts/route.ts', root).href);
const query = process.argv[2] || 'frontend internships in Bengaluru';
const maxAgeDays = Number(process.argv[3] || 7);
const { body, status } = await POST({ json: async () => ({ query, maxAgeDays }) });

const now = Date.now();
const age = (iso) => `${((now - Date.parse(iso)) / 86400000).toFixed(1)}d`;
console.log(`HTTP ${status}  query="${body.appliedQuery}"  window=${body.freshness?.label}`);
console.log('jobsSearch', body.jobsSearch);
console.log('counts', body.counts, 'warnings', body.warnings);
for (const kind of ['posts', 'jobs']) {
  console.log(`\n${kind}: ${body[kind]?.length ?? 0}`);
  for (const r of (body[kind] ?? []).slice(0, 8)) {
    console.log(`   [${age(r.publishedDate)}] ${r.title.slice(0, 70)}${r.company ? ` @ ${r.company}` : ''}${r.location ? ` (${r.location})` : ''}`);
  }
}
