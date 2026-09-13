import { NextResponse } from 'next/server';

type ShippingRequest = {
  weight?: number;
  pickupOnly?: boolean;
  postalCode?: string;
};

type ShippingResult = {
  shippingPrice: number;
  pickupOnly: boolean;
  deliveryMethod: 'Postsending' | 'Henting i butikk';
  weight: number;
  postalCode: string;
  message: string;
};

function calculateShipping(
  weight: number,
  pickupOnly: boolean,
  postalCode: string
): ShippingResult {
  if (pickupOnly) {
    return {
      shippingPrice: 0,
      pickupOnly: true,
      deliveryMethod: 'Henting i butikk',
      weight,
      postalCode,
      message: 'Produktet må hentes i butikk.',
    };
  }

  if (weight <= 0) {
    throw new Error(
      'Produktet mangler gyldig vekt og kan ikke sendes ennå.'
    );
  }

  if (weight > 70) {
    return {
      shippingPrice: 0,
      pickupOnly: true,
      deliveryMethod: 'Henting i butikk',
      weight,
      postalCode,
      message: 'Produkter over 70 kg må hentes i butikk.',
    };
  }

  let shippingPrice: number;

  if (weight <= 10) {
    shippingPrice = 199;
  } else if (weight <= 25) {
    shippingPrice = 299;
  } else if (weight <= 35) {
    shippingPrice = 399;
  } else {
    shippingPrice = 899;
  }

  return {
    shippingPrice,
    pickupOnly: false,
    deliveryMethod: 'Postsending',
    weight,
    postalCode,
    message: `Fast fraktpris for ${weight} kg.`,
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ShippingRequest;
    const weight = Number(body.weight);
    const pickupOnly = body.pickupOnly === true;
    const postalCode = String(body.postalCode || '').trim();

    if (!/^\d{4}$/.test(postalCode)) {
      return NextResponse.json(
        {
          success: false,
          message: 'Postnummer må bestå av fire sifre.',
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(weight) || weight < 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'Produktvekten er ugyldig.',
        },
        { status: 400 }
      );
    }

    const result = calculateShipping(
      weight,
      pickupOnly,
      postalCode
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Feil ved beregning av frakt:', error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Kunne ikke beregne frakt.',
      },
      { status: 500 }
    );
  }
}
