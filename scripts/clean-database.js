const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const DEFAULT_TABLES = ['user_page_states', 'truss_connect_send_logs'];
const ACCOUNT_TABLE = 'truss_connect_accounts';
const PAGE_SIZE = 1000;

function parseArgs(argv) {
  return {
    apply: argv.includes('--apply'),
    includeAccounts: argv.includes('--include-accounts'),
  };
}

function parseEnvFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const env = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    env[key] = value;
  }

  return env;
}

function ensureEnv(env, key) {
  const value = env[key] || process.env[key];
  if (!value) {
    throw new Error(`${key} is missing. Set it in .env.local or process env.`);
  }
  return value;
}

async function fetchAllRows(client, table) {
  const rows = [];
  let from = 0;

  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await client
      .from(table)
      .select('*')
      .not('user_id', 'is', null)
      .order('user_id', { ascending: true })
      .range(from, to);

    if (error) {
      throw new Error(`Failed to read ${table}: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    rows.push(...data);

    if (data.length < PAGE_SIZE) {
      break;
    }

    from += PAGE_SIZE;
  }

  return rows;
}

async function getCount(client, table) {
  const { count, error } = await client
    .from(table)
    .select('*', { count: 'exact', head: true })
    .not('user_id', 'is', null);

  if (error) {
    throw new Error(`Failed to count ${table}: ${error.message}`);
  }

  return count || 0;
}

async function deleteAllRows(client, table) {
  const { error } = await client
    .from(table)
    .delete()
    .not('user_id', 'is', null);

  if (error) {
    throw new Error(`Failed to clean ${table}: ${error.message}`);
  }
}

function buildTimestamp() {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(now.getUTCDate()).padStart(2, '0');
  const hh = String(now.getUTCHours()).padStart(2, '0');
  const mi = String(now.getUTCMinutes()).padStart(2, '0');
  const ss = String(now.getUTCSeconds()).padStart(2, '0');
  return `${yyyy}${mm}${dd}-${hh}${mi}${ss}`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const envPath = path.join(process.cwd(), '.env.local');

  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local not found.');
  }

  const env = parseEnvFile(envPath);
  const supabaseUrl = ensureEnv(env, 'NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = ensureEnv(env, 'SUPABASE_SERVICE_ROLE_KEY');

  const tables = args.includeAccounts
    ? [...DEFAULT_TABLES, ACCOUNT_TABLE]
    : [...DEFAULT_TABLES];

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  const preCounts = {};
  for (const table of tables) {
    preCounts[table] = await getCount(client, table);
  }

  console.log(`Mode: ${args.apply ? 'APPLY' : 'DRY-RUN'}`);
  console.log(`Tables: ${tables.join(', ')}`);
  console.log(`Pre-clean counts: ${JSON.stringify(preCounts)}`);

  const backup = {
    createdAt: new Date().toISOString(),
    mode: args.apply ? 'apply' : 'dry-run',
    tables,
    preCounts,
    data: {},
  };

  for (const table of tables) {
    backup.data[table] = await fetchAllRows(client, table);
  }

  const backupDir = path.join(process.cwd(), 'supabase', 'backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `cleanup-backup-${buildTimestamp()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');

  console.log(`Backup written: ${path.relative(process.cwd(), backupPath)}`);

  if (!args.apply) {
    console.log('Dry-run complete. Re-run with --apply to execute cleanup.');
    return;
  }

  for (const table of tables) {
    await deleteAllRows(client, table);
  }

  const postCounts = {};
  for (const table of tables) {
    postCounts[table] = await getCount(client, table);
  }

  console.log(`Post-clean counts: ${JSON.stringify(postCounts)}`);
  console.log('Cleanup complete.');
}

main().catch((error) => {
  console.error(error.message || String(error));
  process.exit(1);
});
