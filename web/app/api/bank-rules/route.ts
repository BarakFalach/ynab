import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

const UNIQUE_VIOLATION = '23505';

export async function GET() {
  const { data, error } = await getSupabase()
    .from('bank_rules')
    .select('*')
    .order('priority', { ascending: true })
    .order('match_text');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const matchText = String(body.match_text ?? '').trim();
    const payeeName = String(body.payee_name ?? '').trim();
    const categoryId = body.category_id || null;
    const categoryName = categoryId ? body.category_name ?? null : null;
    const transferAccountId = body.transfer_account_id || null;
    const transferAccountName = transferAccountId ? body.transfer_account_name ?? null : null;

    if (!matchText) {
      return NextResponse.json({ error: 'match_text is required' }, { status: 400 });
    }
    if (!payeeName) {
      return NextResponse.json({ error: 'payee_name is required' }, { status: 400 });
    }
    if (!categoryId && !transferAccountId) {
      return NextResponse.json(
        { error: 'Either category_id or transfer_account_id is required' },
        { status: 400 }
      );
    }

    const rawAmount = body.match_amount;
    const matchAmount =
      rawAmount === null || rawAmount === undefined || rawAmount === '' ? null : Number(rawAmount);
    if (matchAmount !== null && !Number.isFinite(matchAmount)) {
      return NextResponse.json({ error: 'match_amount must be a number' }, { status: 400 });
    }

    const rawPriority = body.priority;
    const priority =
      rawPriority === null || rawPriority === undefined || rawPriority === ''
        ? 100
        : Number(rawPriority);
    if (!Number.isInteger(priority)) {
      return NextResponse.json({ error: 'priority must be an integer' }, { status: 400 });
    }

    const row = {
      match_text: matchText,
      match_amount: matchAmount,
      payee_name: payeeName,
      category_id: categoryId,
      category_name: categoryName,
      transfer_account_id: transferAccountId,
      transfer_account_name: transferAccountName,
      priority,
    };

    const query = body.id
      ? getSupabase().from('bank_rules').update(row).eq('id', body.id).select()
      : getSupabase().from('bank_rules').insert([row]).select();
    const { data, error } = await query;

    if (error) {
      if (error.code === UNIQUE_VIOLATION) {
        return NextResponse.json(
          { error: 'A rule with this text and amount already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data?.[0] ?? null);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
