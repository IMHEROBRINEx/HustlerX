import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth-user';
import { getSupabaseAdminClient } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

type PageScope = 'dashboard' | 'main-dashboard' | 'truss-intelligence' | 'truss-connect';

const scopeToColumn: Record<PageScope, string> = {
  dashboard: 'dashboard_state',
  'main-dashboard': 'main_dashboard_state',
  'truss-intelligence': 'truss_intelligence_state',
  'truss-connect': 'truss_connect_state',
};

interface SaveStateBody {
  scope?: PageScope;
  state?: unknown;
}

function isValidScope(scope: string | null): scope is PageScope {
  return Boolean(scope && scope in scopeToColumn);
}

function missingTableHint(errorMessage: string): string | undefined {
  if (!errorMessage.toLowerCase().includes('does not exist')) {
    return undefined;
  }

  return 'The database tables required for saved settings are missing.';
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const scopeParam = request.nextUrl.searchParams.get('scope');
    if (!isValidScope(scopeParam)) {
      return NextResponse.json({ success: false, error: 'Invalid scope' }, { status: 400 });
    }

    const column = scopeToColumn[scopeParam];
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from('user_page_states')
      .select(column)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          hint: missingTableHint(error.message),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      state: data?.[column] ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown page-state error',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let body: SaveStateBody;
    try {
      body = (await request.json()) as SaveStateBody;
    } catch (error) {
      if (
        error instanceof SyntaxError ||
        (error instanceof Error && /json|unexpected token/i.test(error.message))
      ) {
        return NextResponse.json(
          { success: false, error: 'Malformed JSON' },
          { status: 400 }
        );
      }

      throw error;
    }

    if (!body.scope || !isValidScope(body.scope)) {
      return NextResponse.json({ success: false, error: 'Invalid scope' }, { status: 400 });
    }

    const column = scopeToColumn[body.scope];
    const payload = {
      user_id: user.id,
      [column]: body.state ?? {},
      updated_at: new Date().toISOString(),
    };

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase
      .from('user_page_states')
      .upsert(payload as never, { onConflict: 'user_id' });

    if (error) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          hint: missingTableHint(error.message),
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown page-state save error',
      },
      { status: 500 }
    );
  }
}

