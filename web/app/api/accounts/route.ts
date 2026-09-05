import { NextResponse } from 'next/server';
import { fetchAccounts } from '@/lib/ynab';

export const revalidate = 300;

export async function GET() {
  try {
    const accounts = await fetchAccounts();
    return NextResponse.json(accounts);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
