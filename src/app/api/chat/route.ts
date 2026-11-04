import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-user';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = process.env.OPENROUTER_CHAT_MODEL || 'google/gemma-2-9b-it';
const MAX_ROWS_PER_DATASET = 20;
const MAX_RELEVANT_ROWS_PER_DATASET = 35;
const VALUE_CHAR_LIMIT = 120;
const MAX_DATASET_CONTEXT_CHARS = 7000;
const MAX_USER_CONTEXT_CHARS = 2400;
const MAX_COMPLETION_TOKENS = 900;

type DataRow = Record<string, unknown>;

interface ChatDatasets {
  connections?: DataRow[];
  messages?: DataRow[];
  invitations?: DataRow[];
  skills?: DataRow[];
  positions?: DataRow[];
  jobs?: DataRow[];
  activities?: DataRow[];
  comments?: DataRow[];
  memberFollows?: DataRow[];
  companyFollows?: DataRow[];
}

interface ChatRequestBody {
  message?: string;
  context?: string;
  datasets?: ChatDatasets;
}

interface ChatResponseShape {
  answer: string;
  insights: string[];
  actionableTips: string[];
}

const STOP_WORDS = new Set([
  'what',
  'which',
  'when',
  'where',
  'who',
  'whom',
  'whose',
  'why',
  'how',
  'many',
  'much',
  'the',
  'and',
  'for',
  'with',
  'from',
  'into',
  'about',
  'this',
  'that',
  'these',
  'those',
  'your',
  'mine',
  'have',
  'has',
  'had',
  'are',
  'was',
  'were',
  'can',
  'could',
  'should',
  'would',
  'please',
  'show',
  'tell',
  'give',
  'get',
  'based',
  'data',
  'linkedin',
  'profile',
  'connection',
  'connections',
  'network',
]);

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as ChatRequestBody;
    const message = (body.message || '').trim();
    const context = (body.context || '').trim();
    const datasets = sanitizeDatasets(body.datasets);

    if (!message) {
      return NextResponse.json({ success: false, error: 'No message provided' }, { status: 400 });
    }

    const exactNameCountAnswer = getExactNameCountAnswer(message, datasets.connections);
    if (exactNameCountAnswer) {
      return NextResponse.json({ success: true, ...exactNameCountAnswer });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: 'OPENROUTER_API_KEY is not configured',
        },
        { status: 500 }
      );
    }

    const compactContext = capText(context, MAX_USER_CONTEXT_CHARS, '\n[Context truncated for model limit.]');
    const datasetContext = buildDatasetContext(message, datasets);

    const prompt = `You are a LinkedIn data analyst assistant.

You must answer the user using ONLY the provided uploaded CSV data.

Rules:
1) Ground every claim in the provided dataset context.
2) If the user asks for a count, compute it from the rows you received.
3) If data is missing, clearly say which dataset is missing (do not invent limitations).
4) Do not refuse if data is present.
5) Keep the answer practical and concise.

USER'S LINKEDIN DATA:
${compactContext}

DATASET CONTEXT (CSV rows selected from uploaded files):
${datasetContext}

User Question: ${message}

Provide a detailed, actionable response based on the user's data.

Return a JSON object with:
{
  "answer": "your detailed response",
  "insights": ["key insight 1", "key insight 2"],
  "actionableTips": ["tip 1", "tip 2"]
}

Return ONLY valid JSON, no explanation.`;

    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'LinkedIn Insights',
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: MAX_COMPLETION_TOKENS,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${await response.text()}`);
    }

    const data = await response.json();
    const responseText = extractModelText(data);

    const parsed = tryParseAssistantJson(responseText);
    if (parsed) {
      return NextResponse.json({ success: true, ...parsed });
    }

    return NextResponse.json({
      success: true,
      answer: responseText || 'I analyzed your uploaded CSV data and found useful insights.',
      insights: [],
      actionableTips: [],
    });
  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { success: false, error: `Chat failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

function sanitizeDatasets(datasets?: ChatDatasets): Required<ChatDatasets> {
  return {
    connections: asRows(datasets?.connections),
    messages: asRows(datasets?.messages),
    invitations: asRows(datasets?.invitations),
    skills: asRows(datasets?.skills),
    positions: asRows(datasets?.positions),
    jobs: asRows(datasets?.jobs),
    activities: asRows(datasets?.activities),
    comments: asRows(datasets?.comments),
    memberFollows: asRows(datasets?.memberFollows),
    companyFollows: asRows(datasets?.companyFollows),
  };
}

function asRows(value: unknown): DataRow[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is DataRow => {
    return typeof item === 'object' && item !== null && !Array.isArray(item);
  });
}

function getExactNameCountAnswer(message: string, connections: DataRow[]): ChatResponseShape | null {
  const targetName = extractNameCountTarget(message);
  if (!targetName) {
    return null;
  }

  if (connections.length === 0) {
    return {
      answer: 'I cannot count names yet because no connections CSV rows are available in the uploaded data.',
      insights: ['Upload a LinkedIn connections CSV so I can compute exact name counts.'],
      actionableTips: ['Include the file usually named Connections.csv in your upload.'],
    };
  }

  const normalizedTarget = normalizeNameToken(targetName);
  const matches = connections.filter((row) => {
    const firstName = extractConnectionFirstName(row);
    return normalizeNameToken(firstName) === normalizedTarget;
  });

  const exampleNames = matches
    .slice(0, 5)
    .map((row) => {
      const first = extractConnectionFirstName(row);
      const last = getRowString(row, ['Last Name', 'last_name', 'LastName', 'lastName']);
      return `${first}${last ? ` ${last}` : ''}`.trim();
    })
    .filter(Boolean);

  return {
    answer:
      matches.length === 0
        ? `You have 0 connections named ${targetName}.`
        : `You have ${matches.length} connection${matches.length === 1 ? '' : 's'} named ${targetName}.`,
    insights: [
      `Scanned ${connections.length} total connection row${connections.length === 1 ? '' : 's'}.`,
      exampleNames.length > 0
        ? `Example match${exampleNames.length === 1 ? '' : 'es'}: ${exampleNames.join(', ')}.`
        : `No first-name matches found for "${targetName}".`,
    ],
    actionableTips:
      matches.length > 0
        ? ['Use this subset for targeted outreach or personalized follow-ups.']
        : ['Try searching by alternate spellings if you expect a match.'],
  };
}

function extractNameCountTarget(message: string): string | null {
  const patterns = [
    /how\s+many(?:\s+\w+){0,4}\s+named\s+([a-z][a-z'\-]{1,40})\b/i,
    /count(?:\s+of)?(?:\s+\w+){0,4}\s+named\s+([a-z][a-z'\-]{1,40})\b/i,
    /how\s+many\s+([a-z][a-z'\-]{1,40})\s+(?:connections|people|contacts)\b/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match?.[1]) {
      return toTitleCase(match[1]);
    }
  }

  return null;
}

function extractConnectionFirstName(row: DataRow): string {
  const firstName = getRowString(row, [
    'First Name',
    'first_name',
    'FirstName',
    'firstName',
    'Given Name',
    'given_name',
  ]);

  if (firstName) {
    return firstName.split(/\s+/)[0] || '';
  }

  const fullName = getRowString(row, ['Name', 'Full Name', 'full_name']);
  if (!fullName) {
    return '';
  }

  return fullName.split(/\s+/)[0] || '';
}

function getRowString(row: DataRow, preferredKeys: string[]): string {
  const normalizedKeyMap = new Map(
    Object.entries(row).map(([key, value]) => [normalizeKey(key), value])
  );

  for (const key of preferredKeys) {
    const value = normalizedKeyMap.get(normalizeKey(key));
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
  }

  return '';
}

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function normalizeNameToken(value: string): string {
  return value.toLowerCase().trim().replace(/[^a-z0-9'\-]/g, '');
}

function toTitleCase(value: string): string {
  if (!value) {
    return value;
  }
  return value[0].toUpperCase() + value.slice(1).toLowerCase();
}

function capText(value: string, maxChars: number, suffix: string): string {
  if (value.length <= maxChars) {
    return value;
  }

  return `${value.slice(0, maxChars)}${suffix}`;
}

function buildDatasetContext(message: string, datasets: Required<ChatDatasets>): string {
  const queryTokens = extractQueryTokens(message);
  const datasetEntries: Array<{ name: string; rows: DataRow[] }> = [
    { name: 'Connections', rows: datasets.connections },
    { name: 'Messages', rows: datasets.messages },
    { name: 'Invitations', rows: datasets.invitations },
    { name: 'Skills', rows: datasets.skills },
    { name: 'Positions', rows: datasets.positions },
    { name: 'Jobs', rows: datasets.jobs },
    { name: 'Activities', rows: datasets.activities },
    { name: 'Comments', rows: datasets.comments },
    { name: 'Member Follows', rows: datasets.memberFollows },
    { name: 'Company Follows', rows: datasets.companyFollows },
  ];

  const sections = datasetEntries
    .filter((entry) => entry.rows.length > 0)
    .map((entry) => {
      const selectedRows = selectRowsForPrompt(entry.rows, queryTokens);
      const columns = extractColumns(entry.rows);

      return [
        `=== ${entry.name} (${entry.rows.length} rows) ===`,
        `Columns: ${columns.length > 0 ? columns.join(', ') : 'Unknown'}`,
        `Rows Provided To Model (${selectedRows.length}):`,
        formatRows(selectedRows),
      ].join('\n');
    });

  if (sections.length === 0) {
    return 'No CSV row data available.';
  }

  const compiled = sections.join('\n\n');
  if (compiled.length <= MAX_DATASET_CONTEXT_CHARS) {
    return compiled;
  }

  return `${compiled.slice(0, MAX_DATASET_CONTEXT_CHARS)}\n\n[Dataset context truncated to stay within model limits.]`;
}

function extractQueryTokens(message: string): string[] {
  return message
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token))
    .slice(0, 12);
}

function selectRowsForPrompt(rows: DataRow[], queryTokens: string[]): DataRow[] {
  const maxRows = queryTokens.length > 0 ? MAX_RELEVANT_ROWS_PER_DATASET : MAX_ROWS_PER_DATASET;
  if (rows.length <= maxRows) {
    return rows;
  }

  if (queryTokens.length === 0) {
    return rows.slice(0, maxRows);
  }

  const scoredRows = rows
    .map((row, index) => {
      const searchText = rowToSearchText(row);
      const score = queryTokens.reduce((total, token) => {
        if (!searchText.includes(token)) {
          return total;
        }
        return total + (token.length >= 6 ? 2 : 1);
      }, 0);

      return { row, index, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, maxRows)
    .map((entry) => entry.row);

  if (scoredRows.length > 0) {
    return scoredRows;
  }

  return rows.slice(0, maxRows);
}

function rowToSearchText(row: DataRow): string {
  return Object.values(row)
    .map((value) => toDisplayValue(value).toLowerCase())
    .join(' ');
}

function extractColumns(rows: DataRow[]): string[] {
  const columnSet = new Set<string>();

  for (const row of rows.slice(0, 50)) {
    for (const key of Object.keys(row)) {
      if (key.trim()) {
        columnSet.add(key.trim());
      }
    }
  }

  return Array.from(columnSet).slice(0, 25);
}

function formatRows(rows: DataRow[]): string {
  if (rows.length === 0) {
    return 'No rows selected.';
  }

  return rows
    .map((row, index) => {
      const fields = Object.entries(row)
        .map(([key, value]) => `${key}: ${toDisplayValue(value)}`)
        .filter((field) => !field.endsWith(':'))
        .slice(0, 12)
        .join(' | ');

      return `${index + 1}. ${fields || '(empty row)'}`;
    })
    .join('\n');
}

function toDisplayValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value.replace(/\s+/g, ' ').trim().slice(0, VALUE_CHAR_LIMIT);
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  try {
    return JSON.stringify(value).slice(0, VALUE_CHAR_LIMIT);
  } catch {
    return String(value).slice(0, VALUE_CHAR_LIMIT);
  }
}

function extractModelText(data: unknown): string {
  if (!data || typeof data !== 'object') {
    return '';
  }

  const payload = data as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return payload.choices?.[0]?.message?.content || '';
}

function tryParseAssistantJson(responseText: string): ChatResponseShape | null {
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<ChatResponseShape>;
    const answer = typeof parsed.answer === 'string' ? parsed.answer : '';
    const insights = toStringArray(parsed.insights);
    const actionableTips = toStringArray(parsed.actionableTips);

    if (!answer) {
      return null;
    }

    return { answer, insights, actionableTips };
  } catch {
    return null;
  }
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === 'string');
}