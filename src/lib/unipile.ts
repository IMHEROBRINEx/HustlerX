interface UnknownRecord {
  [key: string]: unknown;
}

const DEFAULT_TIMEOUT_MS = 20000;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function getString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function asRecord(value: unknown): UnknownRecord {
  return isRecord(value) ? value : {};
}

function normalizeBaseUrl(raw?: string): string | undefined {
  if (!raw) {
    return undefined;
  }

  const trimmed = raw.trim();
  if (!trimmed) {
    return undefined;
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return undefined;
  }
}

function parseUrlInput(raw?: string): string | undefined {
  if (!raw || !raw.trim()) {
    return undefined;
  }

  return raw.trim();
}

function readPathString(root: unknown, path: string[]): string | undefined {
  let current: unknown = root;

  for (const segment of path) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[segment];
  }

  return getString(current);
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return raw;
  }
}

function normalizeErrorReason(details: unknown, fallback: string): string {
  if (!details) {
    return fallback;
  }

  if (typeof details === 'string') {
    const trimmed = details.trim();
    return trimmed || fallback;
  }

  const record = asRecord(details);
  const fields = [record.detail, record.error, record.message, record.title, record.type];

  for (const field of fields) {
    const text = getString(field);
    if (text) {
      return text;
    }
  }

  return fallback;
}

function stringifyQueryValue(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return JSON.stringify(value);
}

function appendQueryParam(url: URL, key: string, value: unknown): void {
  if (value === undefined || value === null) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => {
      if (item === undefined || item === null) {
        return;
      }

      // Unipile expects array query parameters as repeated keys.
      url.searchParams.append(key, stringifyQueryValue(item));
    });
    return;
  }

  url.searchParams.set(key, stringifyQueryValue(value));
}

export interface UnipileConfiguration {
  configured: boolean;
  missing: string[];
  apiKey?: string;
  baseUrl?: string;
  setupHint: string;
}

export class UnipileApiError extends Error {
  public readonly status: number;
  public readonly details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'UnipileApiError';
    this.status = status;
    this.details = details;
  }
}

export function getUnipileConfiguration(): UnipileConfiguration {
  const apiKey = getString(process.env.UNIPILE_API_KEY);

  const rawBaseUrl =
    parseUrlInput(process.env.UNIPILE_DSN) ||
    parseUrlInput(process.env.UNIPILE_BASE_URL) ||
    parseUrlInput(process.env.UNIPILE_API_URL) ||
    parseUrlInput(process.env.UNIPILE_ACCOUNTS_URL);

  const baseUrl = normalizeBaseUrl(rawBaseUrl);

  const missing: string[] = [];
  if (!apiKey) {
    missing.push('UNIPILE_API_KEY');
  }
  if (!baseUrl) {
    missing.push('UNIPILE_DSN');
  }

  return {
    configured: missing.length === 0,
    missing,
    apiKey,
    baseUrl,
    setupHint:
      'Set UNIPILE_DSN using the --url host from your Unipile curl example, e.g. https://api30.unipile.com:16004.',
  };
}

interface UnipileRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Record<string, unknown>;
  body?: unknown;
}

async function readResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) {
    return null;
  }

  return safeJsonParse(text);
}

function buildPath(path: string): string {
  if (path.startsWith('/')) {
    return path;
  }

  return `/${path}`;
}

function buildUrl(baseUrl: string, path: string, query?: Record<string, unknown>): string {
  const url = new URL(buildPath(path), `${baseUrl}/`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      appendQueryParam(url, key, value);
    });
  }

  return url.toString();
}

export async function unipileRequest<T = unknown>(
  path: string,
  options: UnipileRequestOptions = {},
): Promise<T> {
  const config = getUnipileConfiguration();
  if (!config.configured || !config.apiKey || !config.baseUrl) {
    throw new UnipileApiError(
      `Unipile is not configured. Missing: ${config.missing.join(', ')}`,
      400,
      { missing: config.missing, setupHint: config.setupHint },
    );
  }

  const method = options.method || 'GET';
  const requestUrl = buildUrl(config.baseUrl, path, options.query);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

  const hasBody = options.body !== undefined;

  try {
    const response = await fetch(requestUrl, {
      method,
      headers: {
        accept: 'application/json',
        'X-API-KEY': config.apiKey,
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
      },
      body: hasBody ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const payload = await readResponsePayload(response);

    if (!response.ok) {
      const message = normalizeErrorReason(payload, `Unipile request failed (${response.status})`);
      throw new UnipileApiError(message, response.status, payload);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof UnipileApiError) {
      throw error;
    }

    if (error instanceof Error && error.name === 'AbortError') {
      throw new UnipileApiError('Unipile request timed out', 504);
    }

    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export interface UnipileAccount {
  id: string;
  name?: string;
  type?: string;
  provider?: string;
  raw: UnknownRecord;
}

export async function listUnipileAccounts(): Promise<UnipileAccount[]> {
  const payload = await unipileRequest<unknown>('/api/v1/accounts', { method: 'GET' });
  const root = asRecord(payload);
  const items = Array.isArray(root.items) ? root.items : [];

  return items
    .filter((item): item is UnknownRecord => isRecord(item))
    .map((item, index) => {
      const id =
        getString(item.id) ||
        getString(item.account_id) ||
        `unknown-account-${index + 1}`;

      return {
        id,
        name: getString(item.name),
        type: getString(item.type),
        provider: getString(item.provider),
        raw: item,
      };
    });
}

function scoreLinkedInAccount(account: UnipileAccount): number {
  let score = 0;

  const type = (account.type || '').toLowerCase();
  const provider = (account.provider || '').toLowerCase();
  const name = (account.name || '').toLowerCase();
  const serialized = JSON.stringify(account.raw).toLowerCase();

  if (type.includes('linkedin')) score += 5;
  if (provider.includes('linkedin')) score += 5;
  if (name.includes('linkedin')) score += 3;
  if (serialized.includes('linkedin')) score += 2;

  return score;
}

export function findBestLinkedInAccountId(accounts: UnipileAccount[]): string | null {
  if (accounts.length === 0) {
    return null;
  }

  const scored = accounts
    .map((account) => ({ account, score: scoreLinkedInAccount(account) }))
    .sort((a, b) => b.score - a.score);

  if (scored[0].score > 0) {
    return scored[0].account.id;
  }

  if (accounts.length === 1) {
    return accounts[0].id;
  }

  return null;
}

export interface CreateHostedAuthLinkInput {
  name?: string;
  notifyUrl?: string;
  successRedirectUrl?: string;
  failureRedirectUrl?: string;
  bypassSuccessScreen?: boolean;
  providers?: string[];
  expiresOn?: string;
}

export async function createHostedAuthLink(
  input: CreateHostedAuthLinkInput,
): Promise<{ url: string; expiresOn?: string; endpoint: string }> {
  const config = getUnipileConfiguration();
  if (!config.baseUrl) {
    throw new Error('UNIPILE_DSN is not configured correctly');
  }
  const expiresOn = input.expiresOn || new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const providers = input.providers && input.providers.length > 0 ? input.providers : ['LINKEDIN'];

  const attempts: Array<{ endpoint: string; body: UnknownRecord }> = [
    {
      endpoint: '/api/v1/hosted/accounts/link',
      body: {
        expiresOn,
        api_url: config.baseUrl,
        type: 'create',
        providers,
        name: input.name,
        success_redirect_url: input.successRedirectUrl,
        failure_redirect_url: input.failureRedirectUrl,
        bypass_success_screen: input.bypassSuccessScreen ?? true,
        notify_url: input.notifyUrl,
      },
    },
    {
      endpoint: '/api/connection/link',
      body: {
        expiresOn,
        api_url: config.baseUrl,
        type: 'create',
        providers,
        name: input.name,
        success_redirect_url: input.successRedirectUrl,
        failure_redirect_url: input.failureRedirectUrl,
        bypass_success_screen: input.bypassSuccessScreen ?? true,
        notify_url: input.notifyUrl,
      },
    },
  ];

  let lastError: Error | null = null;

  for (const attempt of attempts) {
    try {
      const payload = await unipileRequest<unknown>(attempt.endpoint, {
        method: 'POST',
        body: attempt.body,
      });

      const record = asRecord(payload);
      const url =
        getString(record.hosted_auth_link) ||
        getString(record.connection_link) ||
        getString(record.url) ||
        getString(record.hosted_auth_url);

      if (!url) {
        throw new Error('Hosted authentication link missing from provider response');
      }

      return {
        url,
        expiresOn: getString(record.expiresOn) || expiresOn,
        endpoint: attempt.endpoint,
      };
    } catch (error) {
      if (error instanceof UnipileApiError && error.status !== 404) {
        throw error;
      }

      lastError = error instanceof Error ? error : new Error('Unknown hosted auth error');
    }
  }

  throw lastError || new Error('Unable to create hosted authentication link');
}

export function parseLinkedInIdentifierFromProfileUrl(profileUrl: string): string | null {
  const trimmed = profileUrl.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const url = new URL(trimmed);
    const segments = url.pathname.split('/').map((segment) => segment.trim()).filter(Boolean);

    const inIndex = segments.findIndex((segment) => segment.toLowerCase() === 'in');
    if (inIndex >= 0 && segments[inIndex + 1]) {
      return decodeURIComponent(segments[inIndex + 1]);
    }

    const profileSegment = segments.find((segment) => segment.length > 0);
    return profileSegment ? decodeURIComponent(profileSegment) : null;
  } catch {
    const match = trimmed.match(/linkedin\.com\/(?:in|pub)\/([^/?#]+)/i);
    if (match && match[1]) {
      return decodeURIComponent(match[1]);
    }

    return null;
  }
}

export function extractProviderIdFromUserPayload(payload: unknown): string | null {
  const candidates = [
    readPathString(payload, ['provider_id']),
    readPathString(payload, ['providerId']),
    readPathString(payload, ['id']),
    readPathString(payload, ['public_identifier']),
    readPathString(payload, ['profile', 'provider_id']),
    readPathString(payload, ['profile', 'providerId']),
    readPathString(payload, ['profile', 'id']),
    readPathString(payload, ['profile', 'public_identifier']),
    readPathString(payload, ['user', 'provider_id']),
    readPathString(payload, ['user', 'id']),
  ];

  for (const candidate of candidates) {
    if (candidate) {
      return candidate;
    }
  }

  return null;
}

export async function resolveProviderIdFromLinkedInProfileUrl(input: {
  profileUrl: string;
  accountId: string;
}): Promise<{ providerId: string | null; identifier: string | null; usedIdentifierFallback: boolean }> {
  const identifier = parseLinkedInIdentifierFromProfileUrl(input.profileUrl);

  if (!identifier) {
    return {
      providerId: null,
      identifier: null,
      usedIdentifierFallback: false,
    };
  }

  const payload = await unipileRequest<unknown>(`/api/v1/users/${encodeURIComponent(identifier)}`, {
    method: 'GET',
    query: {
      account_id: input.accountId,
      linkedin_sections: ['*_preview'],
    },
  });

  const providerId = extractProviderIdFromUserPayload(payload);
  if (providerId) {
    return {
      providerId,
      identifier,
      usedIdentifierFallback: false,
    };
  }

  return {
    providerId: identifier,
    identifier,
    usedIdentifierFallback: true,
  };
}

export async function sendUserInvitation(input: {
  accountId: string;
  providerId: string;
  userEmail?: string;
  message?: string;
}): Promise<{ invitationId?: string; usage?: number }> {
  const payload = await unipileRequest<unknown>('/api/v1/users/invite', {
    method: 'POST',
    body: {
      provider_id: input.providerId,
      account_id: input.accountId,
      ...(input.userEmail ? { user_email: input.userEmail } : {}),
      ...(input.message ? { message: input.message.slice(0, 300) } : {}),
    },
  });

  const record = asRecord(payload);

  const invitationId =
    getString(record.invitation_id) ||
    getString(record.id) ||
    getString(record.request_id) ||
    undefined;

  const usage = typeof record.usage === 'number' ? record.usage : undefined;

  return {
    invitationId,
    usage,
  };
}
