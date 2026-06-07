import { NextResponse } from 'next/server';
import { fetchPayees } from '@/lib/ynab';

// Payees change rarely; cache for 5 minutes (also set per-fetch in lib/ynab.ts).
export const revalidate = 300;

export async function GET() {
  try {
    const payees = await fetchPayees();
    return NextResponse.json(payees);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
