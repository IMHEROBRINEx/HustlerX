import { NextRequest, NextResponse } from 'next/server';
import { exaNeuralSearch } from '@/lib/exa';
import { getAuthenticatedUser } from '@/lib/auth-user';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { query, numResults = 5 } = body;

    if (!query) {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      );
    }

    const results = await exaNeuralSearch(query, numResults);

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('EXA Neural Search error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: `Neural search failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    );
  }
}