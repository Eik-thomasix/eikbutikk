import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 'dummy_key');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { product, customer } = body;

    if (!product || !customer) {
      console.error('❌ Mangler produkt- eller kundedata');
      return NextResponse.json({ success: false, message: 'Ufullstendig data' }, { status: 400 });
    }

    console.log(`🚀 Prosesserer salg for varenr ${product.itemNumber}: ${product.name}`);

    // 1. Forsøk e-postutsendinger via Resend
    if (process.env.RESEND_API_KEY) {
      try {
        // A) Send ordrebekreftelse til kunden
        if (customer.email) {
          await resend.emails.send({
            from: 'Eiksenteret Sortland <onboarding@resend.dev>',
            to: [customer.email],
            subject: `Ordrebekreftelse - Eikbutikk.no (${product.name})`,
            html: `
              <div style="font-family: Arial, sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #d71920; color: white; padding: 20px; text-align: center;">
                  <h1 style="margin: 0; font-size: 22px;">Eikbutikk.no</h1>
                  <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Eiksenteret Sortland</p>
                </div>
                
                <div style="padding: 24px;">
                  <h2 style="margin-top: 0; font-size: 18px; color: #111827;">Takk for din bestilling, ${customer.name}!</h2>
                  
                  <p style="font-size: 14px; color: #374151; line-height: 1.6;">
                    Vi har mottatt din bestilling. Vennligst merk at din ordre <strong>behandles manuelt av våre butikkmedarbeidere</strong> på Sortland før den ferdigstilles.
                  </p>

                  <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 16px; margin: 20px 0;">
                    <h3 style="margin: 0 0 10px 0; font-size: 15px; color: #d71920;">Bestilte varer</h3>
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                      <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 8px 0; font-weight: bold;">Varenr:</td>
                        <td style="padding: 8px 0; text-align: right;">${product.itemNumber}</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 8px 0; font-weight: bold;">Produkt:</td>
                        <td style="padding: 8px 0; text-align: right;">${product.name}</td>
                      </tr>
                      <tr style="border-bottom: 1px solid #e5e7eb;">
                        <td style="padding: 8px 0; font-weight: bold;">Levering:</td>
                        <td style="padding: 8px 0; text-align: right;">${customer.deliveryMethod}</td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; font-weight: bold; font-size: 16px;">Totalt betalt:</td>
                        <td style="padding: 8px 0; text-align: right; font-weight: bold; font-size: 16px; color: #d71920;">${product.salePrice.toLocaleString('no-NO')} kr</td>
                      </tr>
                    </table>
                  </div>

                  <div style="background-color: #f3f4f6; padding: 14px; border-radius: 6px; font-size: 13px; color: #374151; margin-bottom: 20px; line-height: 1.5;">
                    <strong>Henting / Leveringsinformasjon:</strong><br />
                    ${
                      customer.deliveryMethod === 'Henting i butikk'
                        ? 'Varen klargjøres for deg og kan hentes i vår butikk i <strong>Verkstedveien 2, 8402 Sortland</strong> så snart våre medarbeidere har behandlet ordren. Åpningstider: Man-Fre 08:00–16:00.'
                        : 'Våre medarbeidere pakker og gjør varen klar for sending, og den vil bli <strong>sendt så snart som mulig</strong> per post. Du vil bli kontaktet dersom det er behov for ytterligere fraktinformasjon.'
                    }
                  </div>

                  <div style="background-color: #fffbebfb; border: 1px solid #fef3c7; border-radius: 6px; padding: 12px; margin-bottom: 20px; font-size: 12px; color: #92400e; line-height: 1.5;">
                    <strong>Forbehold og betingelser:</strong><br />
                    Vi tar forbehold om skrive- og trykkfeil i pris, tekniske spesifikasjoner og produktbeskrivelser, samt endringer i lagerbeholdning (forbehold om mellomdagssalg i butikken før registrering). Dersom det skulle oppstå avvik eller at varen mot formodning er utsolgt, vil vi kontakte deg omgående for avklaring eller avbestilling.
                  </div>

                  <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />

                  <p style="font-size: 13px; color: #374151; margin: 0; line-height: 1.5;">
                    <strong>Spørsmål om bestillingen?</strong><br />
                    Eiksenteret Sortland | Verkstedveien 2, 8402 Sortland<br />
                    Telefon: 76 12 13 60 | E-post: <a href="mailto:sortland@eiksenteret.no" style="color: #d71920; font-weight: bold;">sortland@eiksenteret.no</a>
                  </p>
                </div>
              </div>
            `,
          });
          console.log(`✉️ Ordrebekreftelse sendt til kunden: ${customer.email}`);
        }

        // B) Send salgsrapport til butikken for SAP B1
        await resend.emails.send({
          from: 'Eikbutikk Salg <onboarding@resend.dev>',
          to: ['sortland@eiksenteret.no'],
          subject: `[NYTT SALG EIKBUTIKK] Varenr: ${product.itemNumber} - ${product.name}`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #1a1a1a; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
              <div style="background-color: #d71920; color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px;">Eikbutikk.no - Salgsrapport</h1>
                <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Eiksenteret Sortland</p>
              </div>
              
              <div style="padding: 24px;">
                <div style="background-color: #fffbebfb; border: 1px solid #fef3c7; border-radius: 6px; padding: 12px; margin-bottom: 20px; font-size: 13px; color: #92400e;">
                  <strong>ℹ️ Viktig påminnelse:</strong> Verifiser alltid at varen er fysisk reservert og at pris stemmer før salgsordre og faktura opprettes i SAP B1.
                </div>

                <p style="font-size: 16px; font-weight: bold; margin-top: 0;">Et nytt salg er registrert på nettbutikken!</p>
                <p style="font-size: 14px; color: #4b5563;">Vennligst opprett salgsordre i <strong>SAP B1</strong> for å trekke varen ut av det formelle lageret.</p>

                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f9fafb; border-radius: 6px;">
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 10px; font-weight: bold; width: 40%;">Kundens Navn:</td>
                    <td style="padding: 10px;">${customer.name}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 10px; font-weight: bold;">Telefon:</td>
                    <td style="padding: 10px;">${customer.phone}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 10px; font-weight: bold;">E-post:</td>
                    <td style="padding: 10px;">${customer.email}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px; font-weight: bold;">Leveringsmetode:</td>
                    <td style="padding: 10px; color: #d71920; font-weight: bold;">${customer.deliveryMethod}</td>
                  </tr>
                </table>

                <h3 style="border-bottom: 2px solid #d71920; padding-bottom: 5px; color: #1a1a1a;">Ordredetaljer (SAP B1):</h3>
                <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                  <thead>
                    <tr style="background-color: #f3f4f6; text-align: left;">
                      <th style="padding: 8px;">Varenr</th>
                      <th style="padding: 8px;">Beskrivelse</th>
                      <th style="padding: 8px;">Antall</th>
                      <th style="padding: 8px;">Avtalt Pris</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style="border-bottom: 1px solid #e5e7eb;">
                      <td style="padding: 8px; font-weight: bold;">${product.itemNumber}</td>
                      <td style="padding: 8px;">${product.name}</td>
                      <td style="padding: 8px;">1 stk</td>
                      <td style="padding: 8px; font-weight: bold; color: #d71920;">${product.salePrice.toLocaleString('no-NO')} kr</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          `,
        });
        console.log('✉️ Salgsrapport e-post sendt til butikken.');
      } catch (emailErr) {
        console.warn('⚠️ Advarsel: Kunne ikke sende e-post via Resend:', emailErr);
      }
    } else {
      console.warn('⚠️ RESEND_API_KEY er ikke satt. Hopper over e-postutsending.');
    }

    // 2. Oppdatering av lager og status i Monday.com
    const mondayApiKey = process.env.MONDAY_API_KEY;
    const mondayBoardId = process.env.MONDAY_BOARD_ID;

    if (mondayApiKey && mondayBoardId) {
      const currentStock = typeof product.stock === 'number' ? product.stock : 1;
      const newStock = Math.max(0, currentStock - 1);
      const newStatus = newStock === 0 ? 'Utsolgt' : 'Aktiv';

      console.log(`📉 Oppdaterer Monday item ${product.id}: Nytt lager = ${newStock}, Ny status = ${newStatus}`);

      const boardQuery = `
        query {
          boards (ids: ${mondayBoardId}) {
            columns {
              id
              title
            }
          }
        }
      `;

      const colRes = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': mondayApiKey,
          'API-Version': '2023-10',
        },
        body: JSON.stringify({ query: boardQuery }),
      });

      const colData = await colRes.json();
      const columns = colData?.data?.boards?.[0]?.columns || [];

      const lagerCol = columns.find((c: any) => c.title.trim().toLowerCase() === 'lager');
      const statusCol = columns.find((c: any) => c.title.trim().toLowerCase() === 'status');

      if (lagerCol && statusCol) {
        const columnValuesObj = {
          [lagerCol.id]: `${newStock}`,
          [statusCol.id]: { label: newStatus },
        };

        const mutationQuery = `
          mutation {
            change_multiple_column_values(
              board_id: ${mondayBoardId},
              item_id: ${product.id},
              column_values: ${JSON.stringify(JSON.stringify(columnValuesObj))}
            ) {
              id
            }
          }
        `;

        const mutRes = await fetch('https://api.monday.com/v2', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': mondayApiKey,
            'API-Version': '2023-10',
          },
          body: JSON.stringify({ query: mutationQuery }),
        });

        const mutData = await mutRes.json();

        if (mutData.errors) {
          console.error('❌ Monday mutation feil:', JSON.stringify(mutData.errors));
        } else {
          console.log('✅ Monday lager og status vellykket oppdatert!');
        }
      } else {
        console.error('❌ Fant ikke kolonner for "Lager" eller "Status" på Monday-brettet.');
      }
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('❌ Kritisk feil ved behandling av ordre:', error);
    return NextResponse.json({ success: false, message: 'Kunne ikke fullføre ordren' }, { status: 500 });
  }
}