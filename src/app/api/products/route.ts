import { NextResponse } from 'next/server';
import { fetchProductsFromMonday } from '@/lib/monday';

export async function GET() {
  try {
    const products = await fetchProductsFromMonday();
    
    // Hvis matrisen er tom, returnerer vi en status-diagnostikk
    return NextResponse.json({
      success: true,
      count: products.length,
      hasApiKey: !!process.env.MONDAY_API_KEY,
      hasBoardId: !!process.env.MONDAY_BOARD_ID,
      boardIdUsed: process.env.MONDAY_BOARD_ID || 'IKKE SATT',
      products,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Feil ved henting av produkter',
      },
      { status: 500 }
    );
  }
}