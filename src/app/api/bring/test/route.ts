import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    hasUid: !!process.env.BRING_API_UID,
    hasApiKey: !!process.env.BRING_API_KEY,
    hasCustomerNumber: !!process.env.BRING_CUSTOMER_NUMBER,
    hasApiCustomer: !!process.env.BRING_API_CUSTOMER,
    uid: process.env.BRING_API_UID,
    customerNumber: process.env.BRING_CUSTOMER_NUMBER,
    apiCustomer: process.env.BRING_API_CUSTOMER,
  });
}