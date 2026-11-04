import { spawnSync } from 'node:child_process';

process.loadEnvFile('.env.local');

const allNames = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'EXA_API_KEY', 'OPENROUTER_API_KEY'];
// The Supabase anon key is public by design (used by the browser client, protected by RLS).
const publicConfig = new Set(['NEXT_PUBLIC_SUPABASE_ANON_KEY']);
const only = process.env.ONLY ? process.env.ONLY.split(',') : null;
const names = only ? allNames.filter((n) => only.includes(n)) : allNames;
const targets = process.argv.slice(2).length ? process.argv.slice(2) : ['production', 'development'];

for (const name of names) {
  const value = process.env[name];
  if (!value) {
    console.log(`${name}: not set locally, skipped`);
    continue;
  }
  for (const target of targets) {
    spawnSync('vercel', ['env', 'rm', name, target, '--yes'], { shell: true, stdio: 'ignore' });
    const args = ['env', 'add', name, target, ...(publicConfig.has(name) ? ['--type', 'config', '--yes'] : [])];
    const res = spawnSync('vercel', args, {
      shell: true,
      input: value,
      encoding: 'utf8',
    });
    console.log(`${name} -> ${target}: ${res.status === 0 ? 'ok' : 'failed (exit ' + res.status + ')'}`);
  }
}
