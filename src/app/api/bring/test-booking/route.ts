import { NextResponse } from "next/server";

export async function GET() {
  const payload = {
    schemaVersion: 1,
    consignments: [
      {
        shippingDateTime: new Date().toISOString(),
        product: {
          id: "5800",
          customerNumber: "1659671",
        },
        correlationId: `EIK-TEST-${Date.now()}`,
        parties: {
          sender: {
            name: "Eiksenteret Sortland",
            addressLine: "Verkstedveien 2",
            postalCode: "8402",
            city: "Sortland",
            countryCode: "NO",
            contact: {
              name: "Eiksenteret Sortland",
              email: process.env.BRING_API_UID,
              phoneNumber: "+4776121360",
            },
          },
          recipient: {
            name: "Bring Test",
            addressLine: "Storgata 1",
            postalCode: "0185",
            city: "Oslo",
            countryCode: "NO",
            contact: {
              name: "Bring Test",
              email: process.env.BRING_API_UID,
              phoneNumber: "+4799999999",
            },
          },
        },
        packages: [
          {
            weightInKg: 5,
            dimensions: {
              heightInCm: 10,
              widthInCm: 20,
              lengthInCm: 30,
            },
          },
        ],
      },
    ],
  };

  const response = await fetch("https://api.bring.com/booking/api/create", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Mybring-API-Uid": process.env.BRING_API_UID || "",
      "X-Mybring-API-Key": process.env.BRING_API_KEY || "",
      "X-Bring-Client-URL": process.env.BRING_CLIENT_URL || "https://www.eikbutikk.no",
      "X-Bring-Test-Indicator": "true",
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();

  return NextResponse.json({
    status: response.status,
    ok: response.ok,
    response: text,
  });
}
