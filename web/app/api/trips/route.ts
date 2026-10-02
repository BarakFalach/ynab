import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  const { data, error } = await getSupabase()
    .from('trips')
    .select('*')
    .order('start_date', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name ?? '').trim();
    const currency = String(body.currency ?? '').trim().toUpperCase();
    const startDate = String(body.start_date ?? '');
    const endDate = String(body.end_date ?? '');
    const categoryId = body.category_id || null;
    const excluded: string[] = Array.isArray(body.excluded_max_categories)
      ? body.excluded_max_categories.map(String)
      : [];

    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    if (!/^[A-Z]{3}$/.test(currency)) {
      return NextResponse.json({ error: 'currency must be a 3-letter code' }, { status: 400 });
    }
    if (!ISO_DAY.test(startDate) || !ISO_DAY.test(endDate)) {
      return NextResponse.json({ error: 'start_date and end_date are required' }, { status: 400 });
    }
    if (endDate < startDate) {
      return NextResponse.json({ error: 'end_date must be on or after start_date' }, { status: 400 });
    }
    if (!categoryId) {
      return NextResponse.json({ error: 'category_id is required' }, { status: 400 });
    }

    const row = {
      name,
      currency,
      start_date: startDate,
      end_date: endDate,
      category_id: categoryId,
      category_name: body.category_name ?? null,
      excluded_max_categories: excluded,
    };

    const query = body.id
      ? getSupabase().from('trips').update(row).eq('id', body.id).select()
      : getSupabase().from('trips').insert([row]).select();
    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data?.[0] ?? null);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
