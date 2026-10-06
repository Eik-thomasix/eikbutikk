export async function createVippsPaymentOrder(params: {
  orderId: string;
  amountInNok: number;
  productName: string;
  returnUrl: string;
  customerPhone?: string; // Telefonnummer fra kassen
}) {
  const baseUrl = getVippsBaseUrl();
  const token = await getVippsAccessToken();

  const amountInEre = Math.round(params.amountInNok * 100);

  // Vasker telefonnummeret slik at det er i rent 8-sifret format uten +47 eller mellomrom
  const cleanPhone = params.customerPhone
    ? params.customerPhone.replace(/\D/g, '').slice(-8)
    : undefined;

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

  // Dersom telefonnummer er oppgitt i kassen, sender vi det til Vipps
  if (cleanPhone && cleanPhone.length === 8) {
    payload.phoneNumber = cleanPhone;
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
    console.error('❌ Vipps betalingsopprettelse feilet:', JSON.stringify(data));
    throw new Error(
      data.message || data[0]?.errorMessage || 'Kunne ikke opprette betaling hos Vipps.'
    );
  }

  return {
    url: data.redirectUrl,
    reference: data.reference,
  };
}