import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 'dummy_key');

// TESTMODUS: Både kunde- og butikkmail sendes hit.
const TEST_EMAIL_ADDRESS = 'thomasix@gmail.com';

interface CheckoutProduct {
  id: string;
  name: string;
  itemNumber?: string;
  salePrice: number;
  shippingPrice?: number;
  totalPrice?: number;
  stock?: number;
}

interface CheckoutCustomer {
  name: string;
  email: string;
  phone: string;
  address?: string;
  postalCode?: string;
  city?: string;
  deliveryMethod?: string;
}

function money(value: number): string {
  return `${value.toLocaleString('no-NO')} kr`;
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function sendOrderEmails(params: {
  product: CheckoutProduct;
  customer: CheckoutCustomer;
  orderReference: string;
  productPrice: number;
  shippingPrice: number;
  totalPrice: number;
}) {
  const {
    product,
    customer,
    orderReference,
    productPrice,
    shippingPrice,
    totalPrice,
  } = params;

  const safe = {
    customerName: escapeHtml(customer.name),
    customerEmail: escapeHtml(customer.email),
    customerPhone: escapeHtml(customer.phone),
    address: escapeHtml(customer.address || ''),
    postalCode: escapeHtml(customer.postalCode || ''),
    city: escapeHtml(customer.city || ''),
    deliveryMethod: escapeHtml(
      customer.deliveryMethod || 'Ikke oppgitt'
    ),
    productName: escapeHtml(product.name),
    itemNumber: escapeHtml(product.itemNumber || 'Ikke oppgitt'),
    orderReference: escapeHtml(orderReference),
  };

  const deliveryText =
    customer.deliveryMethod === 'Henting i butikk'
      ? 'Varen klargjøres for henting hos Eiksenteret Sortland, Verkstedveien 2. Kunden får beskjed når varen er klar.'
      : `Varen klargjøres for postsending til ${safe.address}, ${safe.postalCode} ${safe.city}. Kunden får beskjed når varen er sendt.`;

  const customerEmailHtml = `
    <div style="margin:0;background:#f3f4f6;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
      <div style="max-width:620px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <div style="background:#d71920;color:#ffffff;padding:24px;text-align:center;">
          <h1 style="margin:0;font-size:24px;">Eikbutikk.no</h1>
          <p style="margin:6px 0 0;font-size:14px;">Eiksenteret Sortland</p>
        </div>

        <div style="padding:28px;">
          <p style="margin:0 0 8px;color:#6b7280;font-size:13px;">Ordre ${safe.orderReference}</p>
          <h2 style="margin:0 0 16px;font-size:21px;">Takk for bestillingen, ${safe.customerName}!</h2>
          <p style="margin:0 0 22px;color:#374151;font-size:14px;line-height:1.6;">
            Betalingen er registrert. Ordren behandles manuelt av våre medarbeidere hos Eiksenteret Sortland.
          </p>

          <div style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin:0 0 20px;">
            <div style="background:#f9fafb;padding:14px 16px;font-weight:bold;color:#d71920;">Ordresammendrag</div>
            <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr><td style="padding:11px 16px;border-top:1px solid #e5e7eb;font-weight:bold;">Varenummer</td><td style="padding:11px 16px;border-top:1px solid #e5e7eb;text-align:right;">${safe.itemNumber}</td></tr>
              <tr><td style="padding:11px 16px;border-top:1px solid #e5e7eb;font-weight:bold;">Produkt</td><td style="padding:11px 16px;border-top:1px solid #e5e7eb;text-align:right;">${safe.productName}</td></tr>
              <tr><td style="padding:11px 16px;border-top:1px solid #e5e7eb;font-weight:bold;">Levering</td><td style="padding:11px 16px;border-top:1px solid #e5e7eb;text-align:right;">${safe.deliveryMethod}</td></tr>
              <tr><td style="padding:11px 16px;border-top:1px solid #e5e7eb;">Varepris</td><td style="padding:11px 16px;border-top:1px solid #e5e7eb;text-align:right;">${money(productPrice)}</td></tr>
              <tr><td style="padding:11px 16px;border-top:1px solid #e5e7eb;">Frakt</td><td style="padding:11px 16px;border-top:1px solid #e5e7eb;text-align:right;">${money(shippingPrice)}</td></tr>
              <tr style="background:#fff7f7;"><td style="padding:14px 16px;border-top:2px solid #fecaca;font-size:16px;font-weight:bold;">Totalt betalt</td><td style="padding:14px 16px;border-top:2px solid #fecaca;text-align:right;font-size:17px;font-weight:bold;color:#d71920;">${money(totalPrice)}</td></tr>
            </table>
          </div>

          <div style="background:#f3f4f6;border-radius:8px;padding:15px;font-size:13px;line-height:1.55;color:#374151;">
            <strong>Leveringsinformasjon</strong><br>${deliveryText}
          </div>

          <p style="margin:22px 0 0;font-size:13px;line-height:1.55;color:#4b5563;">
            Spørsmål om bestillingen?<br>
            Eiksenteret Sortland, Verkstedveien 2, 8402 Sortland<br>
            Telefon: 76 12 13 60 · <a href="mailto:sortland@eiksenteret.no" style="color:#d71920;">sortland@eiksenteret.no</a>
          </p>

          <p style="margin:18px 0 0;font-size:11px;color:#9ca3af;">
            Testmodus: Denne kundekopien ble sendt til ${TEST_EMAIL_ADDRESS}. Kundens registrerte e-post er ${safe.customerEmail}.
          </p>
        </div>
      </div>
    </div>
  `;

  const storeEmailHtml = `
    <div style="margin:0;background:#f3f4f6;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:#111827;">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">
        <div style="background:#171717;color:#ffffff;padding:22px 26px;">
          <h1 style="margin:0;font-size:23px;">Nytt salg i Eikbutikk.no</h1>
          <p style="margin:6px 0 0;color:#d1d5db;font-size:14px;">Ordre ${safe.orderReference}</p>
        </div>

        <div style="padding:26px;">
          <div style="background:#fff7ed;border:1px solid #fed7aa;color:#9a3412;border-radius:8px;padding:13px;margin-bottom:20px;font-size:13px;line-height:1.5;">
            <strong>Tiltak:</strong> Kontroller varen fysisk, klargjør levering og opprett salgsordre i SAP B1.
          </div>

          <h2 style="font-size:17px;margin:0 0 10px;color:#d71920;">Kunde og levering</h2>
          <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
            <tr><td style="padding:9px 0;border-bottom:1px solid #e5e7eb;font-weight:bold;width:38%;">Kunde</td><td style="padding:9px 0;border-bottom:1px solid #e5e7eb;">${safe.customerName}</td></tr>
            <tr><td style="padding:9px 0;border-bottom:1px solid #e5e7eb;font-weight:bold;">Telefon</td><td style="padding:9px 0;border-bottom:1px solid #e5e7eb;">${safe.customerPhone}</td></tr>
            <tr><td style="padding:9px 0;border-bottom:1px solid #e5e7eb;font-weight:bold;">E-post</td><td style="padding:9px 0;border-bottom:1px solid #e5e7eb;">${safe.customerEmail}</td></tr>
            <tr><td style="padding:9px 0;border-bottom:1px solid #e5e7eb;font-weight:bold;">Leveringsmetode</td><td style="padding:9px 0;border-bottom:1px solid #e5e7eb;color:#d71920;font-weight:bold;">${safe.deliveryMethod}</td></tr>
            <tr><td style="padding:9px 0;font-weight:bold;">Adresse</td><td style="padding:9px 0;">${safe.address}, ${safe.postalCode} ${safe.city}</td></tr>
          </table>

          <h2 style="font-size:17px;margin:0 0 10px;color:#d71920;">Ordredetaljer for SAP B1</h2>
          <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;">
            <tr style="background:#f3f4f6;"><th style="padding:10px;text-align:left;">Varenr.</th><th style="padding:10px;text-align:left;">Beskrivelse</th><th style="padding:10px;text-align:center;">Antall</th><th style="padding:10px;text-align:right;">Varepris</th></tr>
            <tr><td style="padding:11px 10px;border-bottom:1px solid #e5e7eb;font-weight:bold;">${safe.itemNumber}</td><td style="padding:11px 10px;border-bottom:1px solid #e5e7eb;">${safe.productName}</td><td style="padding:11px 10px;border-bottom:1px solid #e5e7eb;text-align:center;">1</td><td style="padding:11px 10px;border-bottom:1px solid #e5e7eb;text-align:right;">${money(productPrice)}</td></tr>
            <tr><td colspan="3" style="padding:10px;text-align:right;">Frakt</td><td style="padding:10px;text-align:right;">${money(shippingPrice)}</td></tr>
            <tr style="background:#fff7f7;"><td colspan="3" style="padding:12px 10px;text-align:right;font-weight:bold;border-top:2px solid #fecaca;">Totalt betalt</td><td style="padding:12px 10px;text-align:right;font-weight:bold;color:#d71920;border-top:2px solid #fecaca;">${money(totalPrice)}</td></tr>
          </table>
        </div>
      </div>
    </div>
  `;

  const customerResult = await resend.emails.send({
    from: 'Eiksenteret Sortland <onboarding@resend.dev>',
    to: [TEST_EMAIL_ADDRESS],
    subject: `[TEST KUNDE] Ordrebekreftelse ${safe.orderReference} · ${product.name}`,
    html: customerEmailHtml,
  });

  const storeResult = await resend.emails.send({
    from: 'Eikbutikk Salg <onboarding@resend.dev>',
    to: [TEST_EMAIL_ADDRESS],
    subject: `[TEST BUTIKK] Ny ordre ${safe.orderReference} · ${product.itemNumber || product.name}`,
    html: storeEmailHtml,
  });

  if (customerResult.error || storeResult.error) {
    throw new Error(
      customerResult.error?.message ||
        storeResult.error?.message ||
        'Resend returnerte en ukjent feil.'
    );
  }
}

async function updateMondayStock(product: CheckoutProduct) {
  const mondayApiKey = process.env.MONDAY_API_KEY?.trim();
  const mondayBoardId = process.env.MONDAY_BOARD_ID?.trim();

  if (!mondayApiKey || !mondayBoardId) {
    throw new Error('Monday-konfigurasjonen for lager mangler.');
  }

  const columnsQuery = `
    query GetColumns($boardIds: [ID!]!) {
      boards(ids: $boardIds) {
        columns { id title }
      }
    }
  `;

  const columnsResponse = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: mondayApiKey,
      'API-Version': '2023-10',
    },
    body: JSON.stringify({
      query: columnsQuery,
      variables: { boardIds: [mondayBoardId] },
    }),
    cache: 'no-store',
  });

  const columnsData = await columnsResponse.json();
  if (!columnsResponse.ok || columnsData.errors) {
    throw new Error(
      columnsData?.errors?.[0]?.message ||
        'Kunne ikke hente Monday-kolonner.'
    );
  }

  const columns = columnsData?.data?.boards?.[0]?.columns || [];
  const stockColumn = columns.find(
    (column: { title?: string }) =>
      column.title?.trim().toLowerCase() === 'lager'
  );
  const statusColumn = columns.find(
    (column: { title?: string }) =>
      column.title?.trim().toLowerCase() === 'status'
  );

  if (!stockColumn || !statusColumn) {
    throw new Error('Fant ikke kolonnene Lager og Status i Monday.');
  }

  const currentStock =
    typeof product.stock === 'number' ? product.stock : 1;
  const newStock = Math.max(0, currentStock - 1);
  const newStatus = newStock === 0 ? 'Utsolgt' : 'Aktiv';

  const mutation = `
    mutation UpdateProduct(
      $boardId: ID!
      $itemId: ID!
      $values: JSON!
    ) {
      change_multiple_column_values(
        board_id: $boardId
        item_id: $itemId
        column_values: $values
      ) { id }
    }
  `;

  const mutationResponse = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: mondayApiKey,
      'API-Version': '2023-10',
    },
    body: JSON.stringify({
      query: mutation,
      variables: {
        boardId: mondayBoardId,
        itemId: product.id,
        values: JSON.stringify({
          [stockColumn.id]: String(newStock),
          [statusColumn.id]: { label: newStatus },
        }),
      },
    }),
    cache: 'no-store',
  });

  const mutationData = await mutationResponse.json();
  if (!mutationResponse.ok || mutationData.errors) {
    throw new Error(
      mutationData?.errors?.[0]?.message ||
        'Kunne ikke oppdatere lager i Monday.'
    );
  }

  console.log('Monday lager oppdatert:', {
    productId: product.id,
    currentStock,
    newStock,
    newStatus,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const product = body?.product as CheckoutProduct | undefined;
    const customer = body?.customer as CheckoutCustomer | undefined;
    const payment = body?.payment;

    if (!product?.id || !product?.name || !customer?.name) {
      return NextResponse.json(
        { success: false, message: 'Ufullstendig ordredata.' },
        { status: 400 }
      );
    }

    const productPrice = Number(product.salePrice);
    const shippingPrice = Number(product.shippingPrice || 0);
    const suppliedTotal = Number(product.totalPrice);
    const calculatedTotal = productPrice + shippingPrice;
    const totalPrice =
      Number.isFinite(suppliedTotal) && suppliedTotal > 0
        ? suppliedTotal
        : calculatedTotal;

    if (
      !Number.isFinite(productPrice) ||
      productPrice <= 0 ||
      !Number.isFinite(shippingPrice) ||
      shippingPrice < 0 ||
      Math.abs(totalPrice - calculatedTotal) > 0.001
    ) {
      throw new Error('Prisdataene i ordren er ugyldige.');
    }

    const orderReference = String(
      payment?.reference || body?.orderId || 'Ukjent ordrenummer'
    );

    // Lager oppdateres først. Hvis lageroppdateringen feiler, rapporteres ikke
    // checkout som fullført til complete-payment-ruten.
    await updateMondayStock(product);

    if (process.env.RESEND_API_KEY) {
      try {
        await sendOrderEmails({
          product,
          customer,
          orderReference,
          productPrice,
          shippingPrice,
          totalPrice,
        });
        console.log('Test-e-poster sendt til:', TEST_EMAIL_ADDRESS);
      } catch (emailError) {
        // E-postfeil skal logges, men skal ikke føre til nytt lagertrekk ved retry.
        console.error('Kunne ikke sende e-post via Resend:', emailError);
      }
    } else {
      console.warn('RESEND_API_KEY mangler. E-post ble ikke sendt.');
    }

    return NextResponse.json({
      success: true,
      productPrice,
      shippingPrice,
      totalPrice,
      testEmailRecipient: TEST_EMAIL_ADDRESS,
    });
  } catch (error) {
    console.error('Kritisk feil ved behandling av ordre:', error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Kunne ikke fullføre ordren.',
      },
      { status: 500 }
    );
  }
}
