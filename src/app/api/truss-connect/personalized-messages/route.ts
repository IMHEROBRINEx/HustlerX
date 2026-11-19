import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-user';

export const runtime = 'nodejs';
export const maxDuration = 120;

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL =
  process.env.OPENROUTER_TRUSS_CONNECT_MODEL ||
  process.env.OPENROUTER_CHAT_MODEL ||
  'google/gemma-2-9b-it';
const REQUEST_ORIGIN =
  process.env.ORIGIN ||
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'http://localhost:3000';
const MAX_RECIPIENTS = 30;
const MAX_MESSAGE_LENGTH = 280;

type RecipientInput = {
  candidateId?: string;
  fullName?: string;
  firstName?: string;
  title?: string;
  company?: string;
  location?: string;
};

type PersonalizedMessage = {
  candidateId: string;
  fullName: string;
  message: string;
};

interface PersonalizedMessagesRequestBody {
  recipients?: RecipientInput[];
  messageTemplate?: string;
}

interface ParsedModelResponse {
  messages?: Array<{ candidateId?: string; fullName?: string; message?: string }>;
}

function sanitizeText(value: string, maxLength: number): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

function safeFirstName(fullName: string): string {
  const first = fullName.trim().split(/\s+/)[0] || 'there';
  return first;
}

function applyTemplate(
  template: string,
  recipient: Required<Pick<RecipientInput, 'fullName' | 'title' | 'company' | 'location'>>,
): string {
  const firstName = safeFirstName(recipient.fullName);

  return template
    .replace(/\{\{\s*name\s*\}\}/gi, firstName)
    .replace(/\{\{\s*company\s*\}\}/gi, recipient.company || 'your team')
    .replace(/\{\{\s*role\s*\}\}/gi, recipient.title || 'your role')
    .replace(/\{\{\s*location\s*\}\}/gi, recipient.location || 'your region');
}

function fallbackMessage(
  recipient: Required<Pick<RecipientInput, 'fullName' | 'title' | 'company' | 'location'>>,
  template?: string,
): string {
  if (template && template.trim()) {
    return sanitizeText(applyTemplate(template, recipient), MAX_MESSAGE_LENGTH);
  }

  const firstName = safeFirstName(recipient.fullName);
  const roleSegment = recipient.title ? ` as ${recipient.title}` : '';
  const companySegment = recipient.company ? ` at ${recipient.company}` : '';

  return sanitizeText(
    `Hi ${firstName}, I came across your profile${roleSegment}${companySegment} and would love to connect and exchange ideas.`,
    MAX_MESSAGE_LENGTH,
  );
}

function normalizeRecipient(recipient: RecipientInput, index: number): {
  candidateId: string;
  fullName: string;
  title: string;
  company: string;
  location: string;
} {
  return {
    candidateId: recipient.candidateId?.trim() || `candidate-${index + 1}`,
    fullName: recipient.fullName?.trim() || 'Professional',
    title: recipient.title?.trim() || '',
    company: recipient.company?.trim() || '',
    location: recipient.location?.trim() || '',
  };
}

function buildPrompt(
  userName: string,
  recipients: Array<ReturnType<typeof normalizeRecipient>>,
  messageTemplate?: string,
): string {
  const recipientLines = recipients
    .map((recipient, index) => {
      return `${index + 1}. candidateId=${recipient.candidateId} | name=${recipient.fullName} | title=${recipient.title || 'N/A'} | company=${recipient.company || 'N/A'} | location=${recipient.location || 'N/A'}`;
    })
    .join('\n');

  const styleGuide = messageTemplate?.trim()
    ? `Style guidance template (do not keep unresolved placeholders):\n${messageTemplate.trim()}`
    : 'Style guidance: concise, warm, professional, and specific.';

  return `You are writing personalized LinkedIn connection request notes.

Sender name: ${userName}

${styleGuide}

Rules:
1) Write one unique message per recipient.
2) 220 characters max for each message.
3) Mention one relevant detail (title/company/location) when available.
4) No emojis, no hashtags, no markdown.
5) No unresolved placeholders like {{name}}.
6) Keep tone human and professional.

Recipients:
${recipientLines}

Return ONLY valid JSON with this exact structure:
{
  "messages": [
    { "candidateId": "id", "message": "text" }
  ]
}`;
}

function parseModelOutput(
  responseText: string,
  recipients: Array<ReturnType<typeof normalizeRecipient>>,
): PersonalizedMessage[] | null {
  const jsonMatch = responseText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as ParsedModelResponse;
    if (!Array.isArray(parsed.messages)) {
      return null;
    }

    const byCandidateId = new Map<string, string>();

    parsed.messages.forEach((item) => {
      const candidateId = item.candidateId?.trim();
      const message = item.message?.trim();

      if (!candidateId || !message) {
        return;
      }

      byCandidateId.set(candidateId, sanitizeText(message, MAX_MESSAGE_LENGTH));
    });

    return recipients.map((recipient) => {
      const message = byCandidateId.get(recipient.candidateId);
      return {
        candidateId: recipient.candidateId,
        fullName: recipient.fullName,
        message: message && message.length > 0
          ? message
          : fallbackMessage(recipient),
      };
    });
  } catch {
    return null;
  }
}

async function generateWithAI(
  recipients: Array<ReturnType<typeof normalizeRecipient>>,
  messageTemplate: string | undefined,
  userName: string,
): Promise<PersonalizedMessage[] | null> {
  if (!process.env.OPENROUTER_API_KEY) {
    return null;
  }

  const prompt = buildPrompt(userName, recipients, messageTemplate);

  const response = await fetch(OPENROUTER_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'HTTP-Referer': REQUEST_ORIGIN,
      'X-Title': 'HustlerX Connect',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.6,
      max_tokens: 2200,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const responseText = payload.choices?.[0]?.message?.content || '';

  return parseModelOutput(responseText, recipients);
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as PersonalizedMessagesRequestBody;
    const rawRecipients = Array.isArray(body.recipients) ? body.recipients : [];

    if (rawRecipients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one recipient is required' },
        { status: 400 },
      );
    }

    const normalizedRecipients = rawRecipients
      .slice(0, MAX_RECIPIENTS)
      .map((recipient, index) => normalizeRecipient(recipient, index));

    const aiMessages = await generateWithAI(
      normalizedRecipients,
      body.messageTemplate,
      user.fullName || user.email || 'HustlerX user',
    );

    if (aiMessages && aiMessages.length > 0) {
      return NextResponse.json({
        success: true,
        mode: 'ai',
        messages: aiMessages,
      });
    }

    const fallbackMessages = normalizedRecipients.map((recipient) => ({
      candidateId: recipient.candidateId,
      fullName: recipient.fullName,
      message: fallbackMessage(recipient, body.messageTemplate),
    }));

    return NextResponse.json({
      success: true,
      mode: 'fallback',
      warning: 'AI personalization unavailable, generated template-based messages instead.',
      messages: fallbackMessages,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate personalized messages',
      },
      { status: 500 },
    );
  }
}
