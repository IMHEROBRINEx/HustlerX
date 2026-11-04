import { NextRequest, NextResponse } from 'next/server';
import {
  ExaPeopleSearchRequestPayload,
  normalizeExaPeopleResponse,
  parseVariablePayload,
} from '@/lib/exa-people-normalizer';
import { getAuthenticatedUser } from '@/lib/auth-user';

export const runtime = 'nodejs';

const EXA_API_BASE = 'https://api.exa.ai';

function clampNumber(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;

  const rounded = Math.trunc(parsed);
  return Math.min(Math.max(rounded, min), max);
}

function normalizeIncomingRequest(body: Record<string, unknown>): ExaPeopleSearchRequestPayload {
  const query = typeof body.query === 'string' ? body.query.trim() : '';

  return {
    query,
    category: typeof body.category === 'string' && body.category.trim() ? body.category.trim() : 'people',
    numResults: clampNumber(body.numResults, 15, 1, 25),
    type: typeof body.type === 'string' && body.type.trim() ? body.type.trim() : 'auto',
    contents: {
      highlights: {
        maxCharacters: clampNumber(
          (body.contents as Record<string, unknown> | undefined)?.highlights &&
            ((body.contents as Record<string, unknown>).highlights as Record<string, unknown>)?.maxCharacters,
          4000,
          300,
          10000
        ),
      },
    },
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const exaRequest = normalizeIncomingRequest(body);

    if (!exaRequest.query) {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.EXA_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'EXA_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const exaResponse = await fetch(`${EXA_API_BASE}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
      },
      body: JSON.stringify(exaRequest),
    });

    const rawPayloadText = await exaResponse.text();
    const parsedPayload = parseVariablePayload(rawPayloadText);

    if (!exaResponse.ok) {
      return NextResponse.json(
        {
          success: false,
          error: `EXA API request failed with status ${exaResponse.status}`,
          details: parsedPayload,
          request: exaRequest,
        },
        { status: exaResponse.status }
      );
    }

    const normalized = normalizeExaPeopleResponse(parsedPayload);

    return NextResponse.json({
      success: true,
      request: exaRequest,
      normalized,
    });
  } catch (error) {
    console.error('EXA people search error:', error);

    return NextResponse.json(
      {
        success: false,
        error: `People search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      { status: 500 }
    );
  }
}
