import Link from 'next/link';

const updatedDate = '23. september 2026';

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8 sm:py-12">
      <article className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <header className="border-b border-gray-200 bg-neutral-950 px-6 py-8 text-white sm:px-10">
          <p className="text-sm font-semibold uppercase tracking-widest text-red-400">
            Juridiske betingelser
          </p>
          <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
            Salgsvilkår og kjøpsbetingelser
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-300 sm:text-base">
            Gjeldende for netthandel på Tilbudsboden.no, drevet av
            Sortland Maskin AS (Eiksenteret Sortland).
          </p>
          <p className="mt-3 text-xs text-gray-400">
            Sist oppdatert: {updatedDate}
          </p>
        </header>

        <div className="space-y-9 px-6 py-8 text-[15px] leading-7 text-gray-700 sm:px-10 sm:py-10">
          <section>
            <h2 className="text-xl font-bold text-gray-950">1. Avtalen</h2>
            <p className="mt-3">
              Avtalen består av disse salgsbetingelsene, opplysningene som
              gis i bestillingsløsningen og eventuelle særskilt avtalte
              vilkår. Ved motstrid går særskilt avtalte vilkår foran, så
              langt dette ikke strider mot ufravikelig lovgivning.
            </p>
            <p className="mt-3">
              Vilkårene begrenser ikke kjøperens lovbestemte rettigheter
              etter blant annet avtaleloven, forbrukerkjøpsloven,
              markedsføringsloven, angrerettloven og ehandelsloven.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-950">2. Partene</h2>
            <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-5">
              <p className="font-bold text-gray-950">Selger</p>
              <p>Sortland Maskin AS (Eiksenteret Sortland)</p>
              <p>Organisasjonsnummer: 936 858 031</p>
              <p>Verkstedveien 2, 8402 Sortland</p>
              <p>
                E-post:{' '}
                <a className="font-semibold text-red-700 underline" href="mailto:sortland@eiksenteret.no">
                  sortland@eiksenteret.no
                </a>
              </p>
              <p>
                Telefon:{' '}
                <a className="font-semibold text-red-700 underline" href="tel:+4776121360">
                  76 12 13 60
                </a>
              </p>
            </div>
            <p className="mt-4">
              <strong>Kjøper</strong> er forbrukeren som foretar bestillingen
              via Tilbudsboden.no.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-950">3. Pris</h2>
            <p className="mt-3">
              Alle priser oppgis i norske kroner og inkluderer
              merverdiavgift. Den totale prisen, inkludert frakt og andre
              kjente tilleggskostnader, vises i kassen før bestillingen
              fullføres. Kjøper skal ikke belastes kostnader som det ikke er
              informert om før kjøpet.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-950">
              4. Avtaleinngåelse og ordrebekreftelse
            </h2>
            <p className="mt-3">
              Avtalen er bindende når kjøper har sendt bestillingen til
              selger, med forbehold om åpenbare skrive-, taste- eller
              prisfeil som den andre parten forstod eller burde ha forstått
              var feil.
            </p>
            <p className="mt-3">
              Når bestillingen er mottatt, sendes en ordrebekreftelse til
              e-postadressen kjøper har oppgitt. Kjøper skal kontrollere
              ordrebekreftelsen og melde fra så snart som mulig dersom noe
              ikke stemmer.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-950">5. Betaling</h2>
            <p className="mt-3">
              Tilgjengelige betalingsmåter vises i kassen. Tilbudsboden.no
              tilbyr betaling via Vipps. Andre betalingsmåter, for eksempel
              faktura eller delbetaling gjennom en betalingsleverandør, kan
              tilbys senere og vil da fremgå tydelig før bestillingen
              fullføres.
            </p>
            <p className="mt-3">
              Tidspunktet for reservasjon eller belastning og øvrige vilkår
              for betalingen fremgår i kassen og av betalingsleverandørens
              vilkår. Ved faktura eller kreditt kan betalingsleverandøren
              gjennomføre kredittvurdering og stille egne krav til kjøper.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-950">6. Levering</h2>
            <h3 className="mt-4 font-bold text-gray-950">Henting i butikk</h3>
            <p className="mt-1">
              Varen klargjøres for henting hos Eiksenteret Sortland,
              Verkstedveien 2, 8402 Sortland. Kjøper får beskjed når varen er
              klar og bør ikke møte for henting før slik beskjed er mottatt.
            </p>
            <h3 className="mt-4 font-bold text-gray-950">
              Sending med Bring/Posten
            </h3>
            <p className="mt-1">
              Lagervarer sendes normalt innen 1–3 virkedager etter at ordren
              er behandlet. Dersom leveringstid ikke er oppgitt i
              bestillingsløsningen, leveres varen uten unødig opphold og
              senest 30 dager etter bestillingen, med mindre annet er
              avtalt. Kjøper varsles ved forventet forsinkelse.
            </p>
            <p className="mt-3">
              Levering har skjedd når kjøper eller kjøperens representant har
              overtatt varen.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-950">
              7. Risikoen for varen
            </h2>
            <p className="mt-3">
              Risikoen går over på kjøper når kjøper eller kjøperens
              representant har fått varen levert.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-950">8. Angrerett</h2>
            <p className="mt-3">
              Med mindre kjøpet er unntatt fra angrerett, kan kjøper gå fra
              kjøpet i samsvar med angrerettloven. Fristen er 14 dager fra
              dagen etter at varen er mottatt. Ved flere leveranser løper
              fristen normalt fra dagen etter siste vare er mottatt.
            </p>
            <p className="mt-3">
              Melding om bruk av angreretten må sendes før fristen utløper,
              helst skriftlig til{' '}
              <a className="font-semibold text-red-700 underline" href="mailto:sortland@eiksenteret.no">
                sortland@eiksenteret.no
              </a>
              . Kjøper kan også bruke vårt standard angreskjema.
            </p>
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-5">
              <p className="font-bold text-red-950">Standard angreskjema</p>
              <p className="mt-1 text-sm text-red-900">
                Skjemaet kan fylles ut, skrives ut eller lagres som PDF.
              </p>
              <Link
                href="/angreskjema"
                className="mt-3 inline-flex rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700"
              >
                Åpne angreskjema
              </Link>
            </div>
            <p className="mt-3">
              Varen skal returneres uten unødig opphold og senest 14 dager
              etter at melding om bruk av angreretten er gitt. Kjøper kan
              undersøke varen på en forsvarlig måte. Dersom håndteringen går
              utover det som er nødvendig for å fastslå varens art,
              egenskaper og funksjon, kan kjøper bli ansvarlig for redusert
              verdi.
            </p>
            <p className="mt-3">
              Selger tilbakebetaler mottatt betaling uten unødig opphold og
              senest 14 dager etter mottatt melding. Selger kan holde tilbake
              tilbakebetalingen til varen er mottatt, eller kjøper har
              dokumentert at varen er sendt tilbake.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-950">
              9. Retur ved angrerett
            </h2>
            <p className="mt-3">
              Kjøper dekker de direkte kostnadene ved retur, med mindre annet
              er avtalt eller selger ikke har informert om dette før kjøpet.
              Retur kan etter avtale leveres hos Eiksenteret Sortland i
              Verkstedveien 2.
            </p>
            <p className="mt-3">
              Varen bør returneres forsvarlig emballert og, dersom mulig, i
              originalemballasjen. Originalemballasje er ikke i seg selv et
              vilkår for angrerett.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-950">
              10. Forsinkelse og manglende levering
            </h2>
            <p className="mt-3">
              Dersom varen ikke leveres eller leveres for sent, og dette ikke
              skyldes kjøper, kan kjøper etter forbrukerkjøpsloven blant annet
              holde kjøpesummen tilbake, kreve levering, heve kjøpet og kreve
              erstatning når vilkårene for dette er oppfylt. Krav bør meldes
              skriftlig til selger.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-950">
              11. Reklamasjon og mangler
            </h2>
            <p className="mt-3">
              Dersom varen har en feil eller mangel, må kjøper melde fra innen
              rimelig tid etter at mangelen ble oppdaget eller burde ha blitt
              oppdaget. Reklamasjon innen to måneder er alltid i tide.
            </p>
            <p className="mt-3">
              Den absolutte reklamasjonsfristen er normalt to år. Dersom
              varen eller deler av varen ved vanlig bruk er ment å vare
              vesentlig lenger, er fristen fem år.
            </p>
            <p className="mt-3">
              Ved mangel kan kjøper etter forbrukerkjøpsloven blant annet
              kreve retting eller omlevering, prisavslag, heving og/eller
              erstatning når vilkårene for dette er oppfylt. Reklamasjon
              sendes til{' '}
              <a className="font-semibold text-red-700 underline" href="mailto:sortland@eiksenteret.no">
                sortland@eiksenteret.no
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-950">12. Garanti</h2>
            <p className="mt-3">
              Eventuell garanti fra selger eller produsent gir rettigheter i
              tillegg til kjøperens lovbestemte rettigheter. Garantien
              begrenser ikke retten til reklamasjon eller andre krav etter
              ufravikelig lovgivning.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-950">
              13. Forbehold om feil og lagerstatus
            </h2>
            <p className="mt-3">
              Vi tar forbehold om skrivefeil, prisfeil,
              spesifikasjonsfeil, tekniske feil og feil i lagerstatus. Varer
              kan selges i fysisk butikk samtidig som de tilbys på nett.
            </p>
            <p className="mt-3">
              Dersom en vare ikke kan leveres, eller det foreligger en
              åpenbar feil som kjøper forstod eller burde ha forstått, blir
              kjøper kontaktet så raskt som mulig. Eventuelt innbetalt beløp
              tilbakebetales dersom kjøpet ikke kan gjennomføres.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-950">
              14. Personopplysninger
            </h2>
            <p className="mt-3">
              Sortland Maskin AS er behandlingsansvarlig for
              personopplysninger som samles inn i forbindelse med kjøpet.
              Opplysningene behandles for å gjennomføre bestillingen, levere
              varen, håndtere kundeservice, forebygge misbruk og oppfylle
              lovpålagte plikter.
            </p>
            <p className="mt-3">
              Opplysninger deles bare når det er nødvendig, blant annet med
              betalingsleverandører som Vipps eller en eventuell
              faktura-/kredittleverandør, og med Bring/Posten for levering.
              Behandlingen skjer i samsvar med gjeldende
              personvernlovgivning.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-950">
              15. Konfliktløsning
            </h2>
            <p className="mt-3">
              Klager rettes først til selger innen rimelig tid. Partene skal
              forsøke å løse tvisten i minnelighet. Dersom dette ikke lykkes,
              kan kjøper kontakte Forbrukertilsynet for mekling.
            </p>
            <div className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-5">
              <p className="font-bold text-gray-950">Forbrukertilsynet</p>
              <p>Telefon: 23 40 06 00</p>
              <a
                href="https://www.forbrukertilsynet.no"
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-red-700 underline"
              >
                Besøk Forbrukertilsynets nettside
              </a>
            </div>
            <p className="mt-3">
              Tvister kan ellers bringes inn for ordinære domstoler etter
              norsk rett og gjeldende vernetingsregler.
            </p>
          </section>

          <aside className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-950">
            <p className="font-bold">Har du spørsmål om vilkårene?</p>
            <p className="mt-1">
              Kontakt Eiksenteret Sortland på 76 12 13 60 eller{' '}
              <a className="font-semibold underline" href="mailto:sortland@eiksenteret.no">
                sortland@eiksenteret.no
              </a>
              .
            </p>
          </aside>
        </div>

        <footer className="flex flex-col gap-3 border-t border-gray-200 bg-gray-50 px-6 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <p className="text-sm text-gray-600">
            Tilbudsboden.no · Fra Eiksenteret Sortland
          </p>
          <Link
            href="/"
            className="inline-flex w-fit items-center rounded-lg bg-red-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-red-700"
          >
            Tilbake til nettbutikken
          </Link>
        </footer>
      </article>
    </main>
  );
}
