import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const apiKey = process.env.MONDAY_API_KEY?.trim();
    const boardId =
      process.env.MONDAY_ORDER_BOARD_ID?.trim();

    if (!apiKey || !boardId) {
      return NextResponse.json(
        {
          success: false,
          message:
            'MONDAY_API_KEY eller MONDAY_ORDER_BOARD_ID mangler',
        },
        { status: 500 }
      );
    }

    const query = `
      query {
        boards(ids: ${boardId}) {
          id
          name

          groups {
            id
            title
          }

          columns {
            id
            title
            type
          }
        }
      }
    `;

    const response = await fetch(
      'https://api.monday.com/v2',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: apiKey,
          'API-Version': '2023-10',
        },
        body: JSON.stringify({ query }),
      }
    );

    const data = await response.json();

    console.log(
      '=============================='
    );
    console.log('MONDAY ORDREBOARD');
    console.log(
      '=============================='
    );

    console.log(
      JSON.stringify(data, null, 2)
    );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error: any) {
    console.error(
      '❌ Feil ved henting av ordreboard:',
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error.message ||
          'Ukjent feil',
      },
      {
        status: 500,
      }
    );
  }
}