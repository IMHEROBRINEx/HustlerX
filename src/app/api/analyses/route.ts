import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-user';

export const runtime = 'nodejs';

const analyses = new Map<string, unknown>();

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const allAnalyses = Array.from(analyses.values());
    
    return NextResponse.json({
      success: true,
      analyses: allAnalyses,
    });
  } catch (error) {
    console.error('Error fetching analyses:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analyses' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, filename, status } = body;

    if (!id || !filename) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const analysis = {
      id,
      filename,
      status: status || 'pending',
      createdAt: new Date().toISOString(),
    };

    analyses.set(id, analysis);

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    console.error('Error creating analysis:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create analysis' },
      { status: 500 }
    );
  }
}