'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ShieldCheck, MapPin, Phone, Mail, FileText } from 'lucide-react';

export default function TermsPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-red-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Tilbake til nettbutikken
          </button>
          <div className="flex items-center gap-2">
            <span className="bg-red-600 text-white font-extrabold px-2.5 py-0.5 rounded text-sm">
              EIK
            </span>
            <span className="font-bold text-gray-900 text-sm">Tilbudsboden.no</span>
          </div>
        </div>
      </header>

      {/* Innhold */}
      <main className="max-w-4xl mx-auto px-4 py-10 flex-grow w-full">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-10 space-y-8">
          <div className="border-b border-gray-100 pb-6">
            <div className="flex items-center gap-2 text-red-600 font-bold text-sm uppercase tracking-wider mb-2">
              <ShieldCheck className="w-5 h-5" /> Juridiske betingelser
            </div>
            <h1 className="text-3xl font-extrabold text-gray-900">Salgsvilkår & Kjøpsbetingelser</h1>
            <p className="text-gray-500 text-sm mt-1">
              Gjeldende for netthandel på Tilbudsboden.no (Eiksenteret Sortland)
            </p>
          </div>

          <section className="space-y-6 text-sm text-gray-700 leading-relaxed">
            {/* 1. Parter */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2 border-b pb-1">
                1. Parter
              </h2>
              <p>
                <strong>Selger:</strong><br />
                Selskapsnavn: Eiksenteret Sortland (Sortland Landbrukssenter AS / tilhørende enhet)<br />
                Organisasjonsnummer: 936 858 031<br />
                Forretnings- og besøksadresse: Verkstedveien 2, 8402 Sortland<br />
                E-post: sortland@eiksenteret.no<br />
                Telefon: 76 12 13 60<br />
                <br />
                <strong>Kjøper:</strong><br />
                Er den forbrukeren som foretar bestillingen via Tilbudsboden.no.
              </p>
            </div>

            {/* 2. Priser og Betaling */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2 border-b pb-1">
                2. Priser og Betaling
              </h2>
              <p className="mb-2">
                Alle priser på Tilbudsboden.no oppgis i norske kroner (NOK) og inkluderer merverdiavgift (MVA). Totalkostnaden for kjøpet fremkommer i kassen før betaling og inkluderer evt. spesifiserte avgifter.
              </p>
              <p>
                <strong>Betalingsmetode:</strong> Betaling skjer trygt og enkelt via <strong>Vipps</strong>. Kjøpesummen reserveres/belastes i henhold til gjeldende regler for Vipps eCom ved fullføring av transaksjonen. Ingen ordre trer i kraft før betalingen er bekreftet gjennomført.
              </p>
            </div>

            {/* 3. Levering og Utlevering */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2 border-b pb-1">
                3. Levering og Utlevering
              </h2>
              <p className="mb-2">
                <strong>Henting i butikk:</strong> Varen klargjøres for utlevering hos Eiksenteret Sortland i Verkstedveien 2, 8402 Sortland så snart ordren er manuelt behandlet av våre butikkmedarbeidere.
              </p>
              <p>
                <strong>Postpakke:</strong> For varer som tilbys sendt, pakkes og sendes varen så snart som overhodet mulig via Bring/Posten. Risikoen for varen overgår til kjøper når varen er overtatt av kjøper i henhold til forbrukerkjøpsloven.
              </p>
            </div>

            {/* 4. Angrerett */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2 border-b pb-1">
                4. Angrerett
              </h2>
              <p className="mb-2">
                I henhold til angrerettloven har du som forbruker rett til å angre kjøpet innen <strong>14 dager</strong> etter at du mottok varen. 
              </p>
              <p>
                For å benytte angreretten må du gi oss skriftlig melding om dette via e-post til <strong>sortland@eiksenteret.no</strong> innen fristens utløp. Varen må returneres i uendret stand og om mulig i originalemballasjen.
              </p>
            </div>

            {/* 5. Retur og Returkostnader */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2 border-b pb-1">
                5. Retur
              </h2>
              <p>
                Ved bruk av angreretten bærer kjøper de direkte kostnadene ved å returnere varen, med mindre selger har misligholdt avtalen. Retur kan også leveres kostnadsfritt direkte i vår butikk i Verkstedveien 2 etter avtale.
              </p>
            </div>

            {/* 6. Reklamasjonshåndtering */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2 border-b pb-1">
                6. Reklamasjon
              </h2>
              <p>
                Dersom det oppdages feil eller mangler ved et produkt, må kjøper innen rimelig tid (senest innen 2 måneder etter at feilen ble oppdaget) gi selger beskjed om reklamasjonen. Reklamasjon meldes til <strong>sortland@eiksenteret.no</strong> eller ved oppmøte på vårt verksted/butikk.
              </p>
            </div>

            {/* 7. Forbehold om skrivefeil og utsolgte varer */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2 border-b pb-1">
                7. Forbehold (Feilprising og Lager)
              </h2>
              <p>
                Vi tar forbehold om skrive- eller trykkfeil vedrørende pris, spesifikasjoner eller lagerbeholdning. Siden varer også kan selges i vår fysiske butikk parallelt, tar vi forbehold om mellomdagssalg. Dersom en feil oppstår eller varen er utsolgt, vil vi kontakte kjøper omgående og innbetalt beløp blir uavkortet tilbakeført.
              </p>
            </div>

            {/* 8. Konfliktløsning */}
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-2 flex items-center gap-2 border-b pb-1">
                8. Konfliktløsning
              </h2>
              <p>
                Klager rettes til selger innen rimelig tid. Partene skal forsøke å løse eventuelle tvister i minnelighet. Dersom dette ikke lykkes, kan kjøper ta kontakt med Forbrukertilsynet for mekling (telefon 23 40 06 00 eller www.forbrukertilsynet.no).
              </p>
            </div>
          </section>

          {/* Kontaktboks */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 mt-8">
            <h3 className="font-bold text-gray-900 text-base mb-3">Selskaps- og Kontaktinformasjon</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>Verkstedveien 2, 8402 Sortland</span>
              </div>
              <div className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>76 12 13 60</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>sortland@eiksenteret.no</span>
              </div>
            </div>
            <div className="text-xs text-gray-400 mt-3 border-t pt-2">
              Org.nr: 936 858 031 | Eiksenteret Sortland
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-neutral-900 text-gray-400 text-xs py-6 text-center border-t border-neutral-800">
        <p>© {new Date().getFullYear()} Tilbudsboden.no - Eiksenteret Sortland (Org.nr: 936 858 031)</p>
      </footer>
    </div>
  );
}