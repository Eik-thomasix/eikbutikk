import { NextResponse } from 'next/server';
import { fetchProductsFromMonday } from '@/lib/monday';

export async function GET() {
  try {
    const products = await fetchProductsFromMonday();
    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ products: [] }, { status: 500 });
  }
}