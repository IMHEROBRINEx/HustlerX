import { AuthenticatedUser } from '@/lib/auth-user';
import { UnipileAccount } from '@/lib/unipile';

function normalizeText(value?: string): string {
  if (!value) {
    return '';
  }

  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function tokenizeText(value?: string): string[] {
  if (!value) {
    return [];
  }

  const tokens = value.toLowerCase().match(/[a-z0-9]+/g) || [];
  return tokens.filter((token) => token.length >= 3);
}

function readPathString(root: unknown, path: string[]): string | undefined {
  let current: unknown = root;

  for (const segment of path) {
    if (typeof current !== 'object' || current === null) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return typeof current === 'string' && current.trim() ? current : undefined;
}

export function accountBelongsToUser(account: UnipileAccount, user: AuthenticatedUser): boolean {
  const serialized = JSON.stringify(account.raw).toLowerCase();
  const userId = user.id.toLowerCase();

  if ((account.name || '').toLowerCase() === userId || serialized.includes(userId)) {
    return true;
  }

  const accountName = normalizeText(account.name);
  const publicIdentifier = normalizeText(readPathString(account.raw, ['connection_params', 'im', 'publicIdentifier']));
  const username = normalizeText(readPathString(account.raw, ['connection_params', 'im', 'username']));

  const accountCandidates = [accountName, publicIdentifier, username].filter(Boolean);
  if (accountCandidates.length === 0) {
    return false;
  }

  const fullName = normalizeText(user.fullName);
  const email = (user.email || '').toLowerCase();
  const emailLocalRaw = email.split('@')[0] || '';
  const emailLocal = normalizeText(emailLocalRaw);
  const emailLocalWithoutTrailingDigits = emailLocal.replace(/\d+$/g, '');

  const strongHints = [fullName, emailLocal, emailLocalWithoutTrailingDigits]
    .filter((hint) => hint.length >= 4);

  for (const hint of strongHints) {
    if (accountCandidates.some((candidate) => candidate === hint || candidate.includes(hint) || hint.includes(candidate))) {
      return true;
    }
  }

  const identityTokens = Array.from(
    new Set([
      ...tokenizeText(user.fullName),
      ...tokenizeText(emailLocalRaw),
    ]),
  );

  if (identityTokens.length > 0) {
    const tokenMatches = identityTokens.filter((token) =>
      accountCandidates.some((candidate) => candidate.includes(token)),
    ).length;

    if (tokenMatches >= 2) {
      return true;
    }
  }

  if (email && serialized.includes(email)) {
    return true;
  }

  return false;
}
