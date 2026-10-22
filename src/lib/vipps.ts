export interface VippsAccessTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

function getVippsBaseUrl(): string {
  const isTest = process.env.VIPPS_USE_TESTMODE === 'true';

  return isTest
    ? 'https://apitest.vipps.no'
    : 'https://api.vipps.no';
}

export async function getVippsAccessToken(): Promise<string> {
  const baseUrl = getVippsBaseUrl();

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
      client_id: clientId,
      client_secret: clientSecret,
      'Ocp-Apim-Subscription-Key': subscriptionKey,
      'Merchant-Serial-Number': msn,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Feil ved henting av Vipps access token:', data);
    throw new Error(`Vipps autentisering feilet: ${data.message || response.statusText}`);
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
  const baseUrl = getVippsBaseUrl();
  const token = await getVippsAccessToken();

  const amountInEre = Math.round(params.amountInNok * 100);

  // Vasker nummeret og lager sifferstreng med landskode (47XXXXXXXX)
  let digitsOnly = params.customerPhone ? params.customerPhone.replace(/\D/g, '') : '';
  if (digitsOnly.length === 8) {
    digitsOnly = `47${digitsOnly}`;
  }

  const payload: Record<string, unknown> = {
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
    paymentDescription: `Kjøp av ${params.productName.slice(0, 30)} på Tilbudsboden.no`,
  };

  if (digitsOnly.length === 10) {
    // Sendes i alle formater Vipps støtter for web-redirect
    payload.phoneNumber = digitsOnly;
    payload.customer = {
      phoneNumber: digitsOnly,
    };
    payload.profile = {
      phoneNumber: digitsOnly,
    };
  }

  const response = await fetch(`${baseUrl}/epayment/v1/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'Ocp-Apim-Subscription-Key': process.env.VIPPS_SUBSCRIPTION_KEY || '',
      'Merchant-Serial-Number': process.env.VIPPS_MERCHANT_SERIAL_NUMBER || '',
      'Idempotency-Key': params.orderId,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Vipps betalingsopprettelse feilet:', JSON.stringify(data));
    throw new Error(
      data.message || data[0]?.errorMessage || 'Kunne ikke opprette betaling hos Vipps.'
    );
  }

  return {
    url: data.redirectUrl,
    reference: data.reference,
  };
}

export async function getVippsPaymentStatus(reference: string) {
  const baseUrl = getVippsBaseUrl();
  const token = await getVippsAccessToken();

  const response = await fetch(`${baseUrl}/epayment/v1/payments/${reference}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Ocp-Apim-Subscription-Key': process.env.VIPPS_SUBSCRIPTION_KEY || '',
      'Merchant-Serial-Number': process.env.VIPPS_MERCHANT_SERIAL_NUMBER || '',
    },
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('Henting av Vipps-status feilet:', JSON.stringify(data));
    throw new Error(data.message || 'Kunne ikke hente betalingsstatus fra Vipps.');
  }

  return data;
}


export async function captureVippsPayment(params: {
  reference: string;
  amountInNok: number;
}) {
  const reference = params.reference.trim();
  if (!/^[a-zA-Z0-9-]{8,64}$/.test(reference)) {
    throw new Error('Vipps-referansen er ugyldig.');
  }

  const amountInEre = Math.round(Number(params.amountInNok) * 100);
  if (!Number.isInteger(amountInEre) || amountInEre <= 0) {
    throw new Error('Capture-beløpet er ugyldig.');
  }

  const current = await getVippsPaymentStatus(reference);
  const currentState = String(current?.state || 'UNKNOWN').toUpperCase();
  const alreadyCaptured = Number(current?.aggregate?.capturedAmount?.value || 0);

  if (currentState === 'CAPTURED' && alreadyCaptured >= amountInEre) {
    return {
      success: true,
      alreadyCaptured: true,
      state: currentState,
      capturedAmountInEre: alreadyCaptured,
    };
  }

  if (currentState !== 'AUTHORIZED') {
    throw new Error(
      `Vipps-betalingen kan ikke captures fra status ${currentState}.`
    );
  }

  const baseUrl = getVippsBaseUrl();
  const token = await getVippsAccessToken();
  const response = await fetch(
    `${baseUrl}/epayment/v1/payments/${reference}/capture`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'Ocp-Apim-Subscription-Key':
          process.env.VIPPS_SUBSCRIPTION_KEY || '',
        'Merchant-Serial-Number':
          process.env.VIPPS_MERCHANT_SERIAL_NUMBER || '',
        'Idempotency-Key': `${reference}-capture-full`,
        'Vipps-System-Name': 'tilbudsboden',
        'Vipps-System-Version': '1.0.0',
      },
      body: JSON.stringify({
        modificationAmount: {
          currency: 'NOK',
          value: amountInEre,
        },
      }),
      cache: 'no-store',
    }
  );

  const data = await response.json();
  if (!response.ok) {
    console.error('Vipps capture feilet:', JSON.stringify(data));
    throw new Error(
      data?.message ||
        data?.[0]?.errorMessage ||
        'Vipps avviste capture-forespørselen.'
    );
  }

  const capturedAmountInEre = Number(
    data?.aggregate?.capturedAmount?.value || 0
  );
  if (capturedAmountInEre < amountInEre) {
    throw new Error(
      `Vipps bekreftet ikke hele capture-beløpet. Forventet ${amountInEre} øre, bekreftet ${capturedAmountInEre} øre.`
    );
  }

  return {
    success: true,
    alreadyCaptured: false,
    state: 'CAPTURED',
    capturedAmountInEre,
  };
}
