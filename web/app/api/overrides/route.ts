import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabaseServer';
import { normalizePayeeName } from '@/lib/normalize';

// Always reflect the latest writes — never cache.
export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await getSupabase()
    .from('payee_overrides')
    .select('*')
    .order('payee_name');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payeeName = normalizePayeeName(body.payee_name);
    const categoryId = body.category_id;
    const categoryName = body.category_name ?? null;

    if (!payeeName) {
      return NextResponse.json({ error: 'payee_name is required' }, { status: 400 });
    }
    if (!categoryId) {
      return NextResponse.json({ error: 'category_id is required' }, { status: 400 });
    }

    const { data, error } = await getSupabase()
      .from('payee_overrides')
      .upsert(
        [{ payee_name: payeeName, category_id: categoryId, category_name: categoryName }],
        { onConflict: 'payee_name' }
      )
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data?.[0] ?? null);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
