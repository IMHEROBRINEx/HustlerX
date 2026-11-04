export interface ExaPeopleSearchRequestPayload {
  query: string;
  category: string;
  numResults: number;
  type: string;
  contents: {
    highlights: {
      maxCharacters: number;
    };
  };
}

export interface ExaWorkHistoryItem {
  title: string;
  location?: string;
  from?: string;
  to?: string;
  companyName?: string;
}

export interface ExaEducationHistoryItem {
  degree?: string;
  institutionName?: string;
  from?: string;
  to?: string;
}

export interface ExaPersonResultCard {
  id: string;
  title: string;
  url: string;
  publishedDate?: string;
  author?: string;
  image?: string;
  highlights: string[];
  highlightScore?: number;
  personName?: string;
  firstName?: string;
  lastName?: string;
  location?: string;
  workHistory: ExaWorkHistoryItem[];
  educationHistory: ExaEducationHistoryItem[];
}

export interface NormalizedExaPeopleResponse {
  requestId?: string;
  resolvedSearchType?: string;
  searchTimeMs?: number;
  totalCostDollars?: number;
  results: ExaPersonResultCard[];
  warnings: string[];
}

const MAX_PARSE_DEPTH = 5;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
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

function getStringArray(value: unknown): string[] {
  return asArray(value)
    .map((item) => getString(item))
    .filter((item): item is string => Boolean(item));
}

export function parseVariablePayload(payload: unknown): unknown {
  let current: unknown = payload;

  for (let depth = 0; depth < MAX_PARSE_DEPTH; depth += 1) {
    if (typeof current !== 'string') {
      break;
    }

    const trimmed = current.trim();
    if (!trimmed) {
      break;
    }

    try {
      current = JSON.parse(trimmed) as unknown;
      continue;
    } catch {
      const quotedWithDouble = trimmed.startsWith('"') && trimmed.endsWith('"');
      const quotedWithSingle = trimmed.startsWith("'") && trimmed.endsWith("'");

      if (!quotedWithDouble && !quotedWithSingle) {
        break;
      }

      current = trimmed
        .slice(1, -1)
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\\"/g, '"');
    }
  }

  return current;
}

function findResultArray(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  const root = asRecord(payload);

  if (Array.isArray(root.results)) {
    return root.results;
  }

  const containerKeys = ['data', 'response', 'payload', 'output', 'result'];
  for (const key of containerKeys) {
    const container = root[key];

    if (Array.isArray(container)) {
      return container;
    }

    if (isRecord(container) && Array.isArray(container.results)) {
      return container.results;
    }
  }

  return [];
}

function normalizeWorkHistory(value: unknown): ExaWorkHistoryItem[] {
  return asArray(value).map((item) => {
    const record = asRecord(item);
    const company = asRecord(record.company);
    const dates = asRecord(record.dates);

    return {
      title: getString(record.title) ?? 'Unknown role',
      location: getString(record.location),
      from: getString(dates.from),
      to: getString(dates.to),
      companyName: getString(company.name),
    };
  });
}

function normalizeEducationHistory(value: unknown): ExaEducationHistoryItem[] {
  return asArray(value).map((item) => {
    const record = asRecord(item);
    const institution = asRecord(record.institution);
    const dates = asRecord(record.dates);

    return {
      degree: getString(record.degree),
      institutionName: getString(institution.name),
      from: getString(dates.from),
      to: getString(dates.to),
    };
  });
}

function pickPersonProperties(result: Record<string, unknown>): Record<string, unknown> {
  const entities = asArray(result.entities);

  const personEntity = entities.find((entity) => {
    const record = asRecord(entity);
    return getString(record.type)?.toLowerCase() === 'person';
  });

  const chosenEntity = personEntity ?? entities[0];
  const chosenEntityRecord = asRecord(chosenEntity);

  return asRecord(chosenEntityRecord.properties);
}

function normalizeResult(result: unknown, index: number): ExaPersonResultCard {
  const record = asRecord(result);
  const person = pickPersonProperties(record);

  const highlights = getStringArray(record.highlights);
  const highlightScore =
    getNumber(asArray(record.highlightScores)[0]) ??
    getNumber(record.score);

  const title =
    getString(record.title) ??
    getString(person.name) ??
    getString(record.author) ??
    `Profile ${index + 1}`;

  const url = getString(record.url) ?? '';

  const card: ExaPersonResultCard = {
    id: getString(record.id) ?? (url || `result-${index + 1}`),
    title,
    url,
    publishedDate: getString(record.publishedDate),
    author: getString(record.author),
    image: getString(record.image),
    highlights,
    highlightScore,
    personName: getString(person.name),
    firstName: getString(person.firstName),
    lastName: getString(person.lastName),
    location: getString(person.location),
    workHistory: normalizeWorkHistory(person.workHistory),
    educationHistory: normalizeEducationHistory(person.educationHistory),
  };

  return card;
}

export function normalizeExaPeopleResponse(payload: unknown): NormalizedExaPeopleResponse {
  const parsedPayload = parseVariablePayload(payload);
  const root = asRecord(parsedPayload);

  const results = findResultArray(parsedPayload).map((item, index) => normalizeResult(item, index));

  const costDollars = asRecord(root.costDollars);
  const warnings: string[] = [];

  if (results.length === 0) {
    warnings.push('No result entries found in API payload.');
  }

  return {
    requestId: getString(root.requestId),
    resolvedSearchType: getString(root.resolvedSearchType) ?? getString(root.searchType),
    searchTimeMs: getNumber(root.searchTime) ?? getNumber(root.searchTimeMs),
    totalCostDollars: getNumber(costDollars.total) ?? getNumber(root.cost),
    results,
    warnings,
  };
}
