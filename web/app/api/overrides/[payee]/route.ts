import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabaseServer';
import { normalizePayeeName } from '@/lib/normalize';

export const dynamic = 'force-dynamic';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { payee: string } }
) {
  const payeeName = normalizePayeeName(decodeURIComponent(params.payee));

  const { error } = await getSupabase()
    .from('payee_overrides')
    .delete()
    .eq('payee_name', payeeName);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
