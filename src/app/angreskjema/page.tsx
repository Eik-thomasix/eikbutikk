'use client';

import Link from 'next/link';

export default function WithdrawalFormPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 print:bg-white print:px-0 print:py-0 sm:py-12">
      <article className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm print:max-w-none print:rounded-none print:border-0 print:shadow-none">
        <header className="border-b border-gray-200 bg-neutral-950 px-6 py-8 text-white print:bg-white print:px-0 print:py-4 print:text-black sm:px-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-red-400 print:text-black">
            Tilbudsboden.no
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Angreskjema
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300 print:text-gray-700 sm:text-base">
            Fyll ut og send inn skjemaet dersom du ønsker å gå fra en avtale
            om kjøp av varer fra Tilbudsboden.no.
          </p>
        </header>

        <div className="space-y-7 px-6 py-8 text-[15px] leading-7 text-gray-700 print:px-0 print:py-5 sm:px-10 sm:py-10">
          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5 print:bg-white">
            <h2 className="font-bold text-gray-950">Send skjemaet til</h2>
            <p className="mt-2">Sortland Maskin AS (Eiksenteret Sortland)</p>
            <p>Verkstedveien 2, 8402 Sortland</p>
            <p>Organisasjonsnummer: 936 858 031</p>
            <p>
              E-post:{' '}
              <a
                className="font-semibold text-red-700 underline print:text-black"
                href="mailto:sortland@eiksenteret.no"
              >
                sortland@eiksenteret.no
              </a>
            </p>
            <p>Telefon: 76 12 13 60</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-950">
              Melding om bruk av angrerett
            </h2>
            <p className="mt-3">
              Jeg/vi underretter herved om at jeg/vi ønsker å gå fra min/vår
              avtale om kjøp av følgende vare eller varer:
            </p>
            <div className="mt-4 min-h-28 rounded-lg border border-gray-300 p-4 print:min-h-24">
              <span className="text-sm text-gray-400 print:text-gray-500">
                Produktnavn, varenummer og eventuelt antall
              </span>
            </div>
          </section>

          <section className="grid gap-5 sm:grid-cols-2">
            <Field label="Ordrenummer" />
            <Field label="Bestillingsdato" />
            <Field label="Dato varen ble mottatt" />
            <Field label="Telefonnummer" />
          </section>

          <section>
            <Field label="Forbrukerens/forbrukernes navn" />
          </section>

          <section>
            <p className="font-semibold text-gray-950">
              Forbrukerens/forbrukernes adresse
            </p>
            <div className="mt-2 min-h-24 rounded-lg border border-gray-300 p-4" />
          </section>

          <section className="grid gap-5 sm:grid-cols-2">
            <Field label="E-postadresse" />
            <Field label="Dato" />
          </section>

          <section>
            <p className="font-semibold text-gray-950">
              Underskrift dersom papirskjema benyttes
            </p>
            <div className="mt-8 border-b border-gray-500" />
          </section>

          <section className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-950 print:bg-white">
            <h2 className="font-bold">Praktisk informasjon</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>
                Skjemaet må sendes før angrefristen utløper. Du kan også gi
                en annen tydelig skriftlig melding om at angreretten brukes.
              </li>
              <li>
                Varen skal returneres uten unødig opphold og senest 14 dager
                etter at melding om bruk av angreretten er gitt.
              </li>
              <li>
                Kjøper dekker direkte returkostnader når dette er opplyst i
                salgsvilkårene, med mindre annet er avtalt.
              </li>
              <li>
                Ikke send varen før retur og praktisk levering er avklart
                med Eiksenteret Sortland.
              </li>
            </ul>
          </section>

          <div className="flex flex-col gap-3 print:hidden sm:flex-row">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg bg-red-600 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-red-700"
            >
              Skriv ut eller lagre som PDF
            </button>
            <a
              href="mailto:sortland@eiksenteret.no?subject=Bruk%20av%20angrerett%20-%20Tilbudsboden.no"
              className="rounded-lg border border-gray-300 px-5 py-3 text-center text-sm font-bold text-gray-800 transition-colors hover:bg-gray-50"
            >
              Send melding på e-post
            </a>
          </div>
        </div>

        <footer className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-6 py-6 print:hidden sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <p className="text-sm text-gray-600">
            Tilbudsboden.no · Fra Eiksenteret Sortland
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/vilkar"
              className="text-sm font-semibold text-red-700 underline"
            >
              Les salgsvilkårene
            </Link>
            <Link
              href="/"
              className="text-sm font-semibold text-gray-700 underline"
            >
              Tilbake til nettbutikken
            </Link>
          </div>
        </footer>
      </article>
    </main>
  );
}

function Field({ label }: { label: string }) {
  return (
    <div>
      <p className="font-semibold text-gray-950">{label}</p>
      <div className="mt-7 border-b border-gray-500" />
    </div>
  );
}
