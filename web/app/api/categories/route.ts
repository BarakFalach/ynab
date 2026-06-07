import { NextResponse } from 'next/server';
import { fetchCategories } from '@/lib/ynab';

export const revalidate = 300;

export async function GET() {
  try {
    const categories = await fetchCategories();
    return NextResponse.json(categories);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
