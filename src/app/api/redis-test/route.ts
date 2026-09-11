import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function GET() {
  await kv.set('test', 'Eikbutikk');

  const value = await kv.get('test');

  return NextResponse.json({
    success: true,
    value,
  });
}