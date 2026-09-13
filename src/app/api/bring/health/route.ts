import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    rawClientUrl: process.env.BRING_CLIENT_URL,
    length: process.env.BRING_CLIENT_URL?.length,
  });
}