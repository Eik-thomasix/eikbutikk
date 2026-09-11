export interface VippsAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export async function getVippsAccessToken(): Promise<string> {
  const isTest = process.env.VIPPS_USE_TESTMODE === 'true';
  const baseUrl = isTest
    ? 'https://apitest.vipps.no'
    : 'https://api.vipps.no';

  const clientId = process.env.VIPPS_CLIENT_ID;
  const clientSecret = process.env.VIPPS_CLIENT_SECRET;
  const subscriptionKey = process.env.VIPPS_SUBSCRIPTION_KEY;
  const msn = process.env.VIPPS_MERCHANT_SERIAL_NUMBER;

  if (!clientId || !clientSecret || !subscriptionKey || !msn) {
    throw new Error('Mangler en eller flere Vipps API-nøkler i miljøvariablene.');
  }

  const response = await fetch(`${baseUrl}/accesstoken/get`, {
    method: 'POST',
    headers: {
      'client_id': clientId,
      'client_secret': clientSecret,
      'Ocp-Apim-Subscription-Key': subscriptionKey,
      'Merchant-Serial-Number': msn,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('❌ Feil ved henting av Vipps access token:', data);
    throw new Error(`Vipps Autentisering feilet: ${data.message || response.statusText}`);
  }

  return data.access_token;
}

export async function createVippsPaymentOrder(params: {
  orderId: string;
  amountInNok: number;
  productName: string;
  returnUrl: string;
  customerPhone?: string;
}) {
  const isTest = process.env.VIPPS_USE_TESTMODE === 'true';
  const baseUrl = isTest
    ? 'https://apitest.vipps.no'
    : 'https://api.vipps.no';

  const token = await getVippsAccessToken();
  const amountInEre = Math.round(params.amountInNok * 100);

  const rawBaseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const cleanBaseUrl = rawBaseUrl.startsWith('http') ? rawBaseUrl : `https://${rawBaseUrl}`;

  const payload = {
    amount: {
      value: amountInEre,
      currency: 'NOK',
    },
    paymentMethod: {
      type: 'WALLET',
    },
    reference: params.orderId,
    userFlow: 'WEB_REDIRECT',
    returnUrl: params.returnUrl,
    paymentDescription: `Kjøp av ${params.productName.slice(0, 30)} på Eikbutikk.no`,
  };

  console.log('🔍 Kaller Vipps URL:', `${baseUrl}/epayment/v1/payments`);
  
  const response = await fetch(`${baseUrl}/epayment/v1/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Ocp-Apim-Subscription-Key': process.env.VIPPS_SUBSCRIPTION_KEY || '',
      'Merchant-Serial-Number': process.env.VIPPS_MERCHANT_SERIAL_NUMBER || '',
      'Idempotency-Key': params.orderId,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('❌ Vipps betalingsopprettelse feilet:', JSON.stringify(data));
    throw new Error(data.message || data[0]?.errorMessage || 'Kunne ikke opprette betaling hos Vipps.');
  }

  return {
    url: data.redirectUrl,
    reference: data.reference,
  };
}