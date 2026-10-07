import { NextRequest, NextResponse } from 'next/server';
import { createVippsPaymentOrder } from '@/lib/vipps';

function getInternalBaseUrl(request: NextRequest): string {
  return request.nextUrl.origin.replace(/\/+$/, '');
}

async function mondayRequest(
  apiKey: string,
  query: string,
  variables: Record<string, unknown>
) {
  const response = await fetch('https://api.monday.com/v2', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiKey,
      'API-Version': '2023-10',
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });

  const data = await response.json();

  if (!response.ok || data.errors) {
    console.error('Monday GraphQL-feil:', JSON.stringify(data, null, 2));
    throw new Error(
      data?.errors?.[0]?.message ||
        `Monday svarte med HTTP-status ${response.status}.`
    );
  }

  return data;
}

async function getBoardColumnMapping(apiKey: string, boardId: string) {
  const query = `
    query GetBoardColumns($boardIds: [ID!]!) {
      boards(ids: $boardIds) {
        columns {
          id
          title
          type
        }
      }
    }
  `;

  const data = await mondayRequest(apiKey, query, { boardIds: [boardId] });
  const columns: Array<{ id: string; title: string; type: string }> =
    data?.data?.boards?.[0]?.columns || [];

  const findId = (titleName: string) => {
    const match = columns.find(
      (col) => col.title.trim().toLowerCase() === titleName.trim().toLowerCase()
    );
    return match ? match.id : null;
  };

  return {
    orderNumber: findId('Ordrenummer') || 'text_mm73e37c',
    vippsOrderId: findId('Vipps Ordre-ID') || 'text_mm73k8jh',
    paymentStatus: findId('Betalingsstatus') || 'color_mm73ta14',
    orderStatus: findId('Ordrestatus') || 'color_mm73zcsm',
    vippsStatus: findId('Vipps Status') || 'color_mm73pqa6',
    customerName: findId('Kunde') || 'text_mm73x8e9',
    customerEmail: findId('E-post') || 'email_mm73y45r',
    customerPhone: findId('Telefon') || 'phone_mm73k941',
    customerAddress: findId('Adresse') || 'text_mm73m33l',
    customerPostalCode: findId('Postnummer') || 'text_mm73p89n',
    customerCity: findId('Poststed') || 'text_mm73z69p',
    deliveryMethod: findId('Leveringsmåte') || 'color_mm73w78m',
    productName: findId('Produktnavn') || 'text_mm73c41k',
    itemNumber: findId('Varenummer') || 'text_mm73vnum',
    netPrice: findId('Nettpris') || 'numeric_mm73d91l',
    shippingPrice: findId('Frakt') || 'numeric_mm73m87p',
    productJson: findId('Produkt JSON') || 'long_text_mm73r6vx',
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { product, customer, shipping } = body || {};

    if (
      !product?.id ||
      !product?.name ||
      !product?.salePrice ||
      !customer?.name ||
      !customer?.email ||
      !customer?.phone
    ) {
      return NextResponse.json(
        { success: false, message: 'Mangler nødvendige produkt- eller kundedata.' },
        { status: 400 }
      );
    }

    const mondayApiKey = process.env.MONDAY_API_KEY?.trim();
    const orderBoardId = process.env.MONDAY_ORDER_BOARD_ID?.trim();

    if (!mondayApiKey || !orderBoardId) {
      return NextResponse.json(
        { success: false, message: 'Monday-konfigurasjonen for ordre mangler.' },
        { status: 500 }
      );
    }

    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const orderId = `EIK-${randomCode}`;

    const shippingPrice = Number(shipping?.price || 0);
    const salePrice = Number(product.salePrice);
    const totalPrice = salePrice + shippingPrice;

    const deliveryMethod = shipping?.deliveryMethod || customer.deliveryMethod || 'Postsending';

    const storedOrderData = {
      orderId,
      product: {
        id: product.id,
        name: product.name,
        salePrice,
        shippingPrice,
        totalPrice,
        stock: product.stock,
        itemNumber: product.itemNumber || '',
        weight: product.weight,
      },
      customer: {
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        address: customer.address || '',
        postalCode: customer.postalCode || '',
        city: customer.city || '',
        deliveryMethod,
      },
      shipping: {
        price: shippingPrice,
        deliveryMethod,
      },
      createdAt: new Date().toISOString(),
    };

    const productJson = JSON.stringify(storedOrderData);

    // Hent dynamisk oppslag for kolonne-ID-er basert på faktiske kolonnenavn i Monday
    const cols = await getBoardColumnMapping(mondayApiKey, orderBoardId);

    const columnValuesPayload: Record<string, unknown> = {
      [cols.orderNumber]: orderId,
      [cols.vippsOrderId]: orderId,
      [cols.paymentStatus]: { label: 'Venter' },
      [cols.orderStatus]: { label: 'Venter på betaling' },
      [cols.productJson]: productJson,
    };

    if (customer.name && cols.customerName) {
      columnValuesPayload[cols.customerName] = customer.name;
    }
    if (customer.email && cols.customerEmail) {
      columnValuesPayload[cols.customerEmail] = { email: customer.email, text: customer.email };
    }
    if (customer.phone && cols.customerPhone) {
      columnValuesPayload[cols.customerPhone] = { phone: customer.phone, countryShortName: 'NO' };
    }
    if (customer.address && cols.customerAddress) {
      columnValuesPayload[cols.customerAddress] = customer.address;
    }
    if (customer.postalCode && cols.customerPostalCode) {
      columnValuesPayload[cols.customerPostalCode] = customer.postalCode;
    }
    if (customer.city && cols.customerCity) {
      columnValuesPayload[cols.customerCity] = customer.city;
    }
    if (deliveryMethod && cols.deliveryMethod) {
      columnValuesPayload[cols.deliveryMethod] = { label: deliveryMethod };
    }
    if (product.name && cols.productName) {
      columnValuesPayload[cols.productName] = product.name;
    }
    if (product.itemNumber && cols.itemNumber) {
      columnValuesPayload[cols.itemNumber] = product.itemNumber;
    }
    if (salePrice && cols.netPrice) {
      columnValuesPayload[cols.netPrice] = String(salePrice);
    }
    if (cols.shippingPrice) {
      columnValuesPayload[cols.shippingPrice] = String(shippingPrice);
    }

    const mutation = `
      mutation CreateOrder(
        $boardId: ID!
        $itemName: String!
        $columnValues: JSON!
      ) {
        create_item(
          board_id: $boardId
          item_name: $itemName
          column_values: $columnValues
        ) { id }
      }
    `;

    await mondayRequest(mondayApiKey, mutation, {
      boardId: orderBoardId,
      itemName: `Ordre ${orderId} - ${customer.name}`,
      columnValues: JSON.stringify(columnValuesPayload),
    });

    const baseUrl = getInternalBaseUrl(request);
    const returnUrl = `${baseUrl}/api/vipps/verify-payment?reference=${orderId}`;

    const vippsPayment = await createVippsPaymentOrder({
      orderId,
      amountInNok: totalPrice,
      productName: product.name,
      returnUrl,
      customerPhone: customer.phone,
    });

    return NextResponse.json({
      success: true,
      url: vippsPayment.url,
      orderId,
    });
  } catch (error) {
    console.error('Feil i /api/vipps/create-payment:', error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Kunne ikke initiere Vipps-betaling.',
      },
      { status: 500 }
    );
  }
}