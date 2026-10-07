import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 'dummy_key');

// Heads-up til butikken og mottaker for kundesvar
const STORE_EMAIL_ADDRESS = 'sortland@eiksenteret.com';

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

  const isPickup = customer.deliveryMethod === 'Henting i butikk';
  const deliveryText = isPickup
    ? 'Varen klargjøres for henting hos Eiksenteret Sortland (Verkstedveien 2, 8402 Sortland). Du får beskjed så snart varen er klar for henting.'
    : `Varen klargjøres for postsending til <strong>${safe.address}, ${safe.postalCode} ${safe.city}</strong>. Du får beskjed med sporingsnummer når pakken er sendt.`;

  // 1. Moderne e-post til kunden
  const customerEmailHtml = `
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ordrebekreftelse ${safe.orderReference}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f5f7; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing:antialiased; color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f5f7; padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 4px 12px rgba(0, 0, 0, 0.05); border:1px solid #e2e8f0;">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color:#d71920; padding:28px 32px;">
              <table width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td>
                    <h1 style="margin:0; color:#ffffff; font-size:22px; font-weight:700; letter-spacing:-0.5px;">Tilbudsboden.no</h1>
                    <p style="margin:4px 0 0 0; color:#fecaca; font-size:13px; font-weight:500;">Fra Eiksenteret Sortland</p>
                  </td>
                  <td align="right" valign="middle">
                    <span style="background-color:rgba(255, 255, 255, 0.18); color:#ffffff; padding:6px 14px; border-radius:20px; font-size:12px; font-weight:600; display:inline-block; font-family:monospace;">
                      ${safe.orderReference}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Body -->
          <tr>
            <td style="padding:32px;">
              <h2 style="margin:0 0 8px 0; font-size:20px; font-weight:700; color:#0f172a;">
                Takk for bestillingen, ${safe.customerName}!
              </h2>
              <p style="margin:0 0 24px 0; font-size:14px; line-height:1.6; color:#475569;">
                Betalingen din er registrert via Vipps. Ordren behandles nå manuelt av våre medarbeidere hos Eiksenteret Sortland.
              </p>

              <!-- Produktkort -->
              <div style="background-color:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:20px; margin-bottom:24px;">
                <p style="margin:0 0 4px 0; font-size:15px; font-weight:700; color:#0f172a;">${safe.productName}</p>
                <p style="margin:0 0 10px 0; font-size:12px; color:#64748b;">Varenr: <span style="font-family:monospace; font-weight:600;">${safe.itemNumber}</span></p>
                <div style="border-top:1px solid #e2e8f0; padding-top:10px; font-size:13px; color:#334155;">
                  Leveringsmetode: <strong style="color:#0f172a;">${safe.deliveryMethod}</strong>
                </div>
              </div>

              <!-- Prisoppsummering -->
              <table width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td style="padding:6px 0; font-size:14px; color:#64748b;">Varepris</td>
                  <td align="right" style="padding:6px 0; font-size:14px; font-weight:600; color:#0f172a;">${money(productPrice)}</td>
                </tr>
                <tr>
                  <td style="padding:6px 0; font-size:14px; color:#64748b;">Frakt</td>
                  <td align="right" style="padding:6px 0; font-size:14px; font-weight:600; color:#0f172a;">${money(shippingPrice)}</td>
                </tr>
                <tr>
                  <td colspan="2" style="padding:10px 0 0 0;"><div style="border-top:1px solid #e2e8f0;"></div></td>
                </tr>
                <tr>
                  <td style="padding:12px 0 0 0; font-size:16px; font-weight:700; color:#0f172a;">Totalt betalt</td>
                  <td align="right" style="padding:12px 0 0 0; font-size:18px; font-weight:800; color:#d71920;">${money(totalPrice)}</td>
                </tr>
              </table>

              <!-- Leveringsinformasjon -->
              <div style="background-color:#f1f5f9; border-radius:12px; padding:18px; margin-bottom:28px;">
                <h3 style="margin:0 0 8px 0; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.5px; color:#475569;">
                  Leveringsinformasjon
                </h3>
                <p style="margin:0; font-size:13.5px; line-height:1.55; color:#1e293b;">
                  ${deliveryText}
                </p>
              </div>

              <!-- Support Footer -->
              <p style="margin:0; font-size:13px; line-height:1.55; color:#64748b; text-align:center;">
                Spørsmål om bestillingen?<br>
                Eiksenteret Sortland, Verkstedveien 2, 8402 Sortland<br>
                Telefon: <strong>76 12 13 60</strong> · <a href="mailto:sortland@eiksenteret.com" style="color:#d71920; text-decoration:none; font-weight:600;">sortland@eiksenteret.com</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f8fafc; border-top:1px solid #e2e8f0; padding:20px 32px; text-align:center;">
              <p style="margin:0 0 2px 0; font-size:12px; font-weight:600; color:#475569;">Eiksenteret Sortland</p>
              <p style="margin:0; font-size:11.5px; color:#94a3b8;">Verkstedveien 2, 8402 Sortland · sortland@eiksenteret.com</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  // 2. Internt varsel til butikken (Forbeholdt SAP B1-registrering)
  const storeEmailHtml = `
<!DOCTYPE html>
<html lang="no">
<head>
  <meta charset="utf-8">
  <title>Ny ordre ${safe.orderReference}</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f5f7; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color:#1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f4f5f7; padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:640px; background-color:#ffffff; border-radius:14px; overflow:hidden; border:1px solid #e2e8f0;">
          
          <td style="background-color:#18181b; padding:22px 28px; color:#ffffff;">
            <h1 style="margin:0; font-size:20px; font-weight:700;">Nytt salg i Tilbudsboden.no</h1>
            <p style="margin:4px 0 0 0; color:#a1a1aa; font-size:13px; font-family:monospace;">Ordre ${safe.orderReference}</p>
          </td>

          <td style="padding:28px;">
            <div style="background-color:#fff7ed; border:1px solid #fed7aa; color:#9a3412; border-radius:8px; padding:14px; margin-bottom:22px; font-size:13px; line-height:1.5;">
              <strong>Tiltak for butikk:</strong> Kontroller varen fysisk, klargjør levering og opprett salgsordre/faktura i SAP B1.
            </div>

            <h2 style="font-size:15px; font-weight:700; margin:0 0 12px 0; color:#d71920; text-transform:uppercase; letter-spacing:0.5px;">Kunde og levering</h2>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:14px; margin-bottom:24px;">
              <tr><td style="padding:8px 0; border-bottom:1px solid #e2e8f0; color:#64748b; width:35%;">Kunde</td><td style="padding:8px 0; border-bottom:1px solid #e2e8f0; font-weight:600; color:#0f172a;">${safe.customerName}</td></tr>
              <tr><td style="padding:8px 0; border-bottom:1px solid #e2e8f0; color:#64748b;">Telefon</td><td style="padding:8px 0; border-bottom:1px solid #e2e8f0; font-weight:600; color:#0f172a;">${safe.customerPhone}</td></tr>
              <tr><td style="padding:8px 0; border-bottom:1px solid #e2e8f0; color:#64748b;">E-post</td><td style="padding:8px 0; border-bottom:1px solid #e2e8f0; font-weight:600; color:#0f172a;">${safe.customerEmail}</td></tr>
              <tr><td style="padding:8px 0; border-bottom:1px solid #e2e8f0; color:#64748b;">Leveringsmetode</td><td style="padding:8px 0; border-bottom:1px solid #e2e8f0; font-weight:700; color:#d71920;">${safe.deliveryMethod}</td></tr>
              <tr><td style="padding:8px 0; color:#64748b;">Adresse</td><td style="padding:8px 0; font-weight:600; color:#0f172a;">${safe.address}, ${safe.postalCode} ${safe.city}</td></tr>
            </table>

            <h2 style="font-size:15px; font-weight:700; margin:0 0 12px 0; color:#d71920; text-transform:uppercase; letter-spacing:0.5px;">Ordredetaljer for SAP B1</h2>
            <div style="border:1px solid #e2e8f0; border-radius:10px; overflow:hidden;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size:13.5px;">
                <tr style="background-color:#f8fafc;">
                  <th style="padding:10px 14px; text-align:left; color:#475569; font-weight:600;">Varenr.</th>
                  <th style="padding:10px 14px; text-align:left; color:#475569; font-weight:600;">Beskrivelse</th>
                  <th style="padding:10px 14px; text-align:center; color:#475569; font-weight:600;">Antall</th>
                  <th style="padding:10px 14px; text-align:right; color:#475569; font-weight:600;">Varepris</th>
                </tr>
                <tr>
                  <td style="padding:12px 14px; border-top:1px solid #e2e8f0; font-family:monospace; font-weight:700;">${safe.itemNumber}</td>
                  <td style="padding:12px 14px; border-top:1px solid #e2e8f0; font-weight:600;">${safe.productName}</td>
                  <td style="padding:12px 14px; border-top:1px solid #e2e8f0; text-align:center;">1</td>
                  <td style="padding:12px 14px; border-top:1px solid #e2e8f0; text-align:right;">${money(productPrice)}</td>
                </tr>
                <tr>
                  <td colspan="3" style="padding:8px 14px; text-align:right; color:#64748b; border-top:1px solid #e2e8f0;">Frakt</td>
                  <td style="padding:8px 14px; text-align:right; border-top:1px solid #e2e8f0; font-weight:600;">${money(shippingPrice)}</td>
                </tr>
                <tr style="background-color:#fff1f2;">
                  <td colspan="3" style="padding:12px 14px; text-align:right; font-weight:700; border-top:1px solid #fecdd3; color:#0f172a;">Totalt betalt</td>
                  <td style="padding:12px 14px; text-align:right; font-weight:800; border-top:1px solid #fecdd3; color:#d71920; font-size:15px;">${money(totalPrice)}</td>
                </tr>
              </table>
            </div>
          </td>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const customerResult = await resend.emails.send({
    from: 'Tilbudsboden.no <ordre@tilbudsboden.no>',
    to: [customer.email],
    replyTo: STORE_EMAIL_ADDRESS,
    subject: `Ordrebekreftelse ${safe.orderReference} · ${product.name}`,
    html: customerEmailHtml,
  });

  const storeResult = await resend.emails.send({
    from: 'Tilbudsboden.no <ordre@tilbudsboden.no>',
    to: [STORE_EMAIL_ADDRESS],
    replyTo: customer.email,
    subject: `Ny ordre ${safe.orderReference} · ${product.itemNumber || product.name}`,
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
        console.log('E-post sendt til kunden:', customer.email);
      } catch (emailError) {
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
      customerEmail: customer.email,
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