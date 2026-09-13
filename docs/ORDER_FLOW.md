# Order Flow

Dette dokumentet beskriver hele ordreflyten i Eikbutikk.no, fra kunden åpner et produkt til varen er sendt eller hentet.

Formålet er å:

- dokumentere hvordan systemene henger sammen
- beskrive hvilke API-ruter som utfører de ulike stegene
- sikre riktig håndtering av betaling, lager, frakt og utsendelse
- forhindre dobbeltbehandling av ordre
- gi et tydelig grunnlag for testing og produksjonssetting

Sist oppdatert: 13.09.2026

---

# 1. Systemoversikt

Ordreflyten bruker følgende systemer:

```text
Eikbutikk.no
↓
Monday.com
↓
Vipps
↓
Bring
↓
Resend
```

## Ansvarsfordeling

### Eikbutikk.no

- viser produkter
- mottar kundeopplysninger
- beregner frakt
- starter Vipps-betaling
- kontrollerer betalingen etter retur fra Vipps
- oppretter Bring-forsendelser
- viser ordrebekreftelse

### Monday.com

- lagrer produktdata
- lagrer lagerbeholdning
- lagrer ordre
- styrer ordrestatus
- lagrer fraktbeløp
- lagrer sporingsnummer
- lagrer sendingsdato
- lagrer lenke til Bring-etikett

### Vipps

- gjennomfører betalingen
- returnerer betalingsstatus
- returnerer kunden til Eikbutikk.no etter betaling

### Bring

- oppretter forsendelsen
- genererer PDF-etikett
- genererer sporingsnummer
- genererer sporingslenke

### Resend

- sender ordrebekreftelse
- sender intern salgsrapport
- skal senere sende e-post når varen er sendt

---

# 2. Produktflyt

## 2.1 Produktdata lagres i Monday

Produktboardet er master for produktdata.

Produktet inneholder blant annet:

- produkt-ID
- produktnavn
- varenummer
- kategori
- nettpris
- lagerbeholdning
- produktbilder
- produktbeskrivelse
- leveringsmetode
- vekt
- lengde
- bredde
- høyde

## 2.2 Produktdata hentes til nettbutikken

Nettbutikken henter produkter gjennom:

```text
/api/products
```

Produktdataene behandles i:

```text
src/lib/monday.ts
```

## 2.3 Produktet vises på produktsiden

Produktsiden ligger under:

```text
/product/[id]
```

Produktsiden viser blant annet:

- produktnavn
- bilder
- pris
- lagerstatus
- kort produktinformasjon
- produktbeskrivelse
- leveringsalternativer
- kjøpsknapp

Et produkt med lagerbeholdning på `0` skal ikke kunne kjøpes.

---

# 3. Checkout

## 3.1 Kunden åpner checkout

Kunden klikker:

```text
Kjøp med Vipps nå
```

Dette åpner:

```text
CheckoutModal
```

## 3.2 Kundeinformasjon

Checkout samler inn:

- fullt navn
- e-postadresse
- telefonnummer
- adresse
- postnummer
- poststed
- leveringsmetode

## 3.3 Leveringsmetode

Tilgjengelige leveringsmetoder:

```text
Postsending
```

eller:

```text
Henting i butikk
```

Produkter som er merket for kun henting, eller produkter over gjeldende vektgrense, skal ikke kunne velge Postsending.

---

# 4. Fraktberegning

## 4.1 Frakt beregnes fra produktvekten

Checkout kaller:

```text
POST /api/shipping/calculate
```

Forespørselen inneholder:

- produktvekt
- postnummer
- informasjon om produktet kun kan hentes

## 4.2 Gjeldende fraktpriser

```text
0 til 10 kg:
199 kr
```

```text
Over 10 til 25 kg:
299 kr
```

```text
Over 25 til 35 kg:
399 kr
```

```text
Over 35 til 70 kg:
899 kr
```

```text
Over 70 kg:
Kun henting
```

## 4.3 Prisvisning i checkout

Checkout viser:

```text
Varepris
+ Frakt
= Totalt
```

Eksempel:

```text
Varepris: 16 990 kr
Frakt:       299 kr
Totalt:   17 289 kr
```

Ved henting i butikk:

```text
Frakt: 0 kr
```

## 4.4 Serveren beregner frakten på nytt

Fraktbeløpet fra nettleseren skal ikke brukes som eneste grunnlag.

Før Vipps-betalingen opprettes, henter serveren:

- nettpris
- lagerbeholdning
- produktvekt
- leveringsbegrensninger

direkte fra Monday.

Serveren beregner deretter frakten på nytt.

Dette hindrer manipulering av:

- produktpris
- fraktpris
- totalbeløp
- lagerstatus

---

# 5. Opprettelse av ordre

## 5.1 Kunden starter Vipps-betalingen

Checkout kaller:

```text
POST /api/vipps/create-payment
```

## 5.2 Serveren validerer ordren

Før ordren opprettes kontrolleres:

- produktet finnes
- produktet har gyldig nettpris
- produktet er på lager
- produktet har gyldig vekt
- kundeinformasjonen er komplett
- postnummeret består av fire sifre
- leveringsmetoden er gyldig

## 5.3 Serveren beregner totalbeløpet

```text
totalPrice = salePrice + shippingPrice
```

Ved henting:

```text
shippingPrice = 0
```

## 5.4 Ordren opprettes i Monday

Ordren opprettes først i gruppen:

```text
Venter på betaling
```

Ordren inneholder blant annet:

- ordrenummer
- produkt-ID
- produktnavn
- varenummer
- produktpris
- fraktpris
- totalpris i Produkt JSON
- kundenavn
- telefon
- e-post
- adresse
- postnummer
- poststed
- leveringsmetode
- betalingsstatus
- ordrestatus
- Vipps-referanse

## 5.5 Ordrenummer

Ordrenummeret følger formatet:

```text
EIK-XXXXXXXX
```

Eksempel:

```text
EIK-07014172
```

Ordrenummeret brukes også som Vipps-referanse.

---

# 6. Vipps-betaling

## 6.1 Betalingen opprettes

Serveren sender følgende beløp til Vipps:

```text
Produktpris + frakt
```

Ikke bare produktprisen.

## 6.2 Kunden gjennomfører betalingen

Kunden sendes til Vipps og godkjenner betalingen.

## 6.3 Vipps returnerer kunden til produktsiden

Returadressen følger dette mønsteret:

```text
/product/PRODUKT-ID?vipps_order=EIK-ORDRENUMMER
```

Eksempel:

```text
/product/13023886514?vipps_order=EIK-07014172
```

## 6.4 Krav til produksjonsdomene

Følgende miljøvariabel må være korrekt:

```env
NEXT_PUBLIC_BASE_URL=https://www.eikbutikk.no
```

Hvis returadressen mangler `vipps_order`, blir ikke betalingen ferdigbehandlet.

---

# 7. Fullføring av betaling

## 7.1 Produktsiden oppdager Vipps-returen

Når produktsiden finner:

```text
vipps_order
```

i URL-en, kalles:

```text
POST /api/vipps/complete-payment
```

## 7.2 Vipps-status kontrolleres

Følgende betalingsstatus godtas i dagens testflyt:

```text
AUTHORIZED
```

og:

```text
CAPTURED
```

Mislykkede statuser behandles separat.

## 7.3 Beløpet kontrolleres

Beløpet hos Vipps sammenlignes med:

```text
totalPrice
```

Hvis `totalPrice` mangler, brukes:

```text
salePrice + shippingPrice
```

Betalingen skal ikke ferdigbehandles dersom beløpene ikke stemmer.

## 7.4 Ordren finnes i Monday

Systemet søker etter ordren ved hjelp av:

- ordrenummer
- Vipps-ordre-ID

Hvis ordren ikke finnes, stoppes ferdigbehandlingen.

## 7.5 Beskyttelse mot dobbelt lagertrekk

Før lageret oppdateres kontrolleres feltet:

```text
stockUpdated
```

Hvis lageret allerede er oppdatert, skal ordren ikke behandles på nytt.

---

# 8. Lageroppdatering

## 8.1 Checkout-ruten kalles

Etter vellykket betalingskontroll kalles:

```text
POST /api/checkout
```

## 8.2 Lageret reduseres

Gjeldende lager reduseres med én:

```text
newStock = currentStock - 1
```

Lageret skal aldri bli lavere enn `0`.

## 8.3 Produktstatus oppdateres

Hvis nytt lager er større enn `0`:

```text
Status = Aktiv
```

Hvis nytt lager er `0`:

```text
Status = Utsolgt
```

## 8.4 Monday-ordren oppdateres

Etter vellykket behandling settes:

```text
Betalingsstatus = Betalt
```

```text
Ordrestatus = Behandles
```

```text
Vipps-status = Autorisert eller Captured
```

```text
Lager oppdatert = true
```

## 8.5 Ordren flyttes

Ordren flyttes fra:

```text
Venter på betaling
```

til:

```text
Behandles
```

---

# 9. Ordrebekreftelser

## 9.1 Kundemail

Etter vellykket betaling sendes en ordrebekreftelse som inneholder:

- ordrenummer
- varenummer
- produktnavn
- leveringsmetode
- varepris
- frakt
- totalt betalt
- leveringsinformasjon
- kontaktinformasjon

## 9.2 Intern butikkmail

Butikken mottar en salgsrapport som inneholder:

- ordrenummer
- kundenavn
- telefon
- e-post
- adresse
- leveringsmetode
- varenummer
- produktnavn
- antall
- varepris
- frakt
- totalbeløp
- påminnelse om videre behandling i SAP B1

## 9.3 Testmodus for e-post

Kunde- og butikkmail sendes foreløpig til:

```text
thomasix@gmail.com
```

Dette skal beholdes under testing.

Før produksjon skal:

- kundemail sendes til kundens registrerte e-post
- butikkmail sendes til valgt intern mottaker
- testmerking fjernes fra emnefelt
- testtekst fjernes fra e-postmalene

---

# 10. Ordrebekreftelsesside

## 10.1 Kunden sendes til bekreftelsessiden

Etter vellykket ferdigbehandling sendes kunden til:

```text
/ordre-bekreftet?ordrenr=EIK-ORDRENUMMER
```

## 10.2 Bekreftelsen vises

Siden viser at ordren er mottatt.

## 10.3 Kunden sendes videre

Etter ordrebekreftelsen sendes kunden videre til forsiden.

---

# 11. Ordrebehandling i Monday

## 11.1 Venter på betaling

Ordren er opprettet, men betalingen er ikke bekreftet og ferdigbehandlet.

Ingen varer skal sendes fra denne gruppen.

## 11.2 Behandles

Ordren er:

- betalingskontrollert
- lagerbehandlet
- klar for pakking eller klargjøring

En postsendingsordre er nå klar for Bring-booking.

## 11.3 Sendt / Hentet

Gruppe-ID:

```text
group_mm73mky8
```

Ordren flyttes hit når:

- postsendingen er opprettet hos Bring

eller:

- varen er hentet i butikken

---

# 12. Bring-flyt

## 12.1 Manuell handling

En medarbeider skal bevisst starte Bring-bookingen når varen er pakket og klar.

Bring-booking skal ikke opprettes automatisk umiddelbart etter betaling.

Dette gir mulighet til å:

- kontrollere varen
- kontrollere adressen
- kontrollere pakkemålene
- håndtere eventuelle avvik
- stoppe en sending før booking

## 12.2 Bring-testsiden

Gjeldende utviklingsside:

```text
/bring-test
```

Testsiden brukes til:

- Bring-test
- Monday update-test
- visning av tekniske API-svar

Testsiden er ikke en ferdig produksjonsklar adminside.

## 12.3 Create-shipment-ruten

Bring-booking utføres av:

```text
POST /api/bring/create-shipment
```

Forespørselen inneholder:

```text
orderId
```

og beskyttes foreløpig med:

```text
x-admin-secret
```

## 12.4 Ordren valideres

Før booking kontrolleres:

- ordren finnes
- ordren er markert som Betalt
- leveringsmetoden er Postsending
- ordren har kundeinformasjon
- ordren har produkt-ID
- produktet har vekt
- produktet har lengde
- produktet har bredde
- produktet har høyde
- produktet er ikke over 70 kg
- ordren ikke har sporingsnummer fra før

## 12.5 Produktdata hentes fra Monday

Følgende pakkedata hentes fra produktboardet:

```text
Vekt (kg)
numeric_mm75drw8
```

```text
Lengde (cm)
numeric_mm75t3qf
```

```text
Bredde (cm)
numeric_mm75mdjp
```

```text
Høyde (cm)
numeric_mm75vbef
```

## 12.6 Bring-tjeneste

Gjeldende tjenestekode:

```text
5800
```

Gjeldende kundenummer for Booking API:

```text
1659671
```

## 12.7 Bring-request

Bring mottar blant annet:

- bestillingsdato
- tjenestekode
- kundenummer
- ordrenummer
- avsender
- mottaker
- kontaktinformasjon
- produktnavn
- vekt
- lengde
- bredde
- høyde

## 12.8 Bring returnerer

Ved vellykket booking returnerer Bring:

- forsendelsesnummer
- pakkenummer
- sporingsnummer
- sporingslenke
- PDF-etikett

---

# 13. Bring-testmodus

## 13.1 Aktiv testmodus

Under utvikling skal følgende være satt:

```env
BRING_TEST_MODE=true
```

I testmodus:

- Bring mottar en testbooking
- sporingsnummer genereres
- sporingslenke genereres
- PDF-etikett genereres
- Monday skal ikke oppdateres av `create-shipment`
- ordren skal ikke flyttes
- kundemail om utsendelse skal ikke sendes

## 13.2 Forventet testrespons

```json
{
  "success": true,
  "testMode": true,
  "mondayUpdated": false
}
```

## 13.3 Produksjonsmodus

Produksjonsmodus aktiveres senere med:

```env
BRING_TEST_MODE=false
```

Dette skal ikke gjøres før produksjonssjekklisten er gjennomgått.

---

# 14. Monday-oppdatering etter Bring

Når produksjonsflyten aktiveres, skal følgende felter oppdateres:

## Sporingsnummer

```text
text_mm75q5sa
```

## Sendingsdato

```text
date_mm75z9jw
```

## Bring PDF

```text
link_mm75mrj7
```

## Ordrestatus

```text
Sendt
```

## Gruppe

```text
Sendt / Hentet
group_mm73mky8
```

---

# 15. Sporingsmail

## 15.1 Status

Ikke ferdigstilt.

## 15.2 Når e-posten skal sendes

E-posten skal bare sendes etter at:

- Bring-bookingen er vellykket
- sporingsnummeret finnes
- sporingslenken finnes
- PDF-lenken finnes
- Monday er oppdatert
- ordren er flyttet til «Sendt / Hentet»

## 15.3 E-posten skal inneholde

- kundens navn
- ordrenummer
- produktnavn
- beskjed om at varen er sendt
- sporingsnummer
- sporingslenke
- kontaktinformasjon til Eiksenteret Sortland

## 15.4 Testmodus

Under testing skal sporingsmail sendes til:

```text
thomasix@gmail.com
```

Ikke til kundens faktiske e-postadresse.

---

# 16. Beskyttelse mot dobbeltbehandling

## 16.1 Betaling

Vipps-betalingen skal ikke ferdigbehandles flere ganger.

## 16.2 Lager

Lageret skal ikke trekkes mer enn én gang.

Kontrolleres med:

```text
stockUpdated
```

## 16.3 Bring

Bring-sendingen skal ikke opprettes mer enn én gang.

Kontrolleres ved at ordren ikke kan bookes dersom sporingsnummer allerede finnes i:

```text
text_mm75q5sa
```

## 16.4 E-post

Kunde- og sporingsmail bør ikke sendes flere ganger ved retry eller sideoppdatering.

Dette må verifiseres før produksjon.

---

# 17. Feilflyt

## 17.1 Vipps-feil før betaling

Hvis Vipps-betalingen ikke kan opprettes:

- ordren markeres som Feilet
- ingen lageroppdatering skal gjennomføres
- ingen fraktbooking skal opprettes

## 17.2 Vipps avbrutt eller utløpt

Ved status som:

```text
ABORTED
CANCELLED
EXPIRED
TERMINATED
```

skal ordren behandles som mislykket eller kansellert.

## 17.3 Beløpsavvik

Hvis bekreftet Vipps-beløp ikke samsvarer med ordrebeløpet:

- ferdigbehandlingen stoppes
- lageret skal ikke trekkes
- ordren skal ikke flyttes til «Behandles»

## 17.4 Manglende pakkedata

Hvis vekt eller mål mangler:

- Bring-booking stoppes
- ordren blir liggende i «Behandles»
- medarbeider må korrigere produktdata

## 17.5 Bring avviser bookingen

Hvis Bring avviser bookingen:

- Monday skal ikke oppdateres med sendingsdata
- ordren skal ikke flyttes til «Sendt / Hentet»
- sporingsmail skal ikke sendes
- teknisk feil skal vises og logges

## 17.6 Monday-oppdatering feiler

Hvis Bring-booking lykkes, men Monday-oppdateringen feiler:

- sendingen må ikke bookes på nytt automatisk
- forsendelsen må kontrolleres i Mybring
- sporingsnummer og PDF må gjenopprettes manuelt eller med en sikker reparasjonsrutine

Dette er et produksjonskritisk scenario.

---

# 18. Henting i butikk

## 18.1 Frakt

Ved henting:

```text
Frakt = 0 kr
```

## 18.2 Bring

Det skal ikke opprettes Bring-sending for ordre med:

```text
Henting i butikk
```

## 18.3 Monday

Ordren flyttes først til:

```text
Behandles
```

Når varen er utlevert, kan ordren flyttes til:

```text
Sendt / Hentet
```

## 18.4 Kundekommunikasjon

Kunden skal få beskjed når varen er klar for henting.

Denne meldingen er ikke en del av Bring-flyten.

---

# 19. Testflyt

## 19.1 Bring-test

```text
Betalt testordre
↓
/bring-test
↓
Kjør Bring-test
↓
/api/bring/create-shipment
↓
Bring testbooking
↓
Etikett, sporing og sporingsnummer vises
↓
Monday oppdateres ikke
```

## 19.2 Monday update-test

```text
Testordre
↓
/bring-test
↓
Test Monday-oppdatering
↓
/api/monday/test-update
↓
Testverdier skrives til Monday
```

Testverdiene er:

```text
TEST-TRACKING-12345
```

og:

```text
https://example.com/test-label.pdf
```

Disse skal fjernes før produksjon.

---

# 20. Produksjonsflyt

Når løsningen er ferdigstilt, skal flyten være:

```text
Kunden velger produkt
↓
Kunden fyller ut checkout
↓
Frakt beregnes
↓
Serveren validerer pris, lager og frakt
↓
Ordre opprettes i «Venter på betaling»
↓
Kunden betaler med Vipps
↓
Vipps sender kunden tilbake med vipps_order
↓
Betaling og totalbeløp kontrolleres
↓
Lager reduseres
↓
Ordren flyttes til «Behandles»
↓
Ordrebekreftelse sendes
↓
Medarbeider kontrollerer og pakker varen
↓
Medarbeider klikker «Generer Bring-etikett»
↓
Bring-sending opprettes
↓
Sporingsnummer og PDF returneres
↓
Monday oppdateres
↓
Ordren flyttes til «Sendt / Hentet»
↓
Sporingsmail sendes til kunden
↓
Etiketten skrives ut og festes på pakken
```

---

# 21. Punkter som gjenstår

- [ ] Rydde testdata fra Monday.
- [ ] Oppdatere automatisk flytting til «Sendt / Hentet» i en kontrollert test.
- [ ] Bygge profesjonell adminvisning for Bring-booking.
- [ ] Vise kunde, produkt, adresse og pakkemål før booking.
- [ ] Legge inn bekreftelse før Bring-sending opprettes.
- [ ] Bygge e-post «Varen er sendt».
- [ ] Legge sporingslenke i kundemailen.
- [ ] Beholde testmottaker for e-post under utvikling.
- [ ] Verifisere beskyttelse mot dobbeltbooking.
- [ ] Verifisere beskyttelse mot doble e-poster.
- [ ] Erstatte tidligere eksponert Bring API-nøkkel.
- [ ] Sikre eller fjerne `/bring-test`.
- [ ] Kontrollere vekt og mål for alle produkter.
- [ ] Gjennomgå `BRING_GO_LIVE_CHECKLIST.md`.
- [ ] Endre `BRING_TEST_MODE` til `false`.
- [ ] Kjør ny Vercel-deploy.
- [ ] Gjennomføre én kontrollert ekte sending.
- [ ] Kontrollere første faktiske Bring-kostnad.

---

# 22. Produksjonskritiske referanser

## Ordreboard

```text
18430730386
```

## Sendt / Hentet

```text
group_mm73mky8
```

## Sporingsnummer

```text
text_mm75q5sa
```

## Sendingsdato

```text
date_mm75z9jw
```

## Bring PDF

```text
link_mm75mrj7
```

## Vekt

```text
numeric_mm75drw8
```

## Lengde

```text
numeric_mm75t3qf
```

## Bredde

```text
numeric_mm75mdjp
```

## Høyde

```text
numeric_mm75vbef
```

## Bring kundenummer for Booking API

```text
1659671
```

## Bring-tjeneste

```text
5800
```

---

# 23. Endringslogg

## 13.09.2026

- Produktflyten ble dokumentert.
- Checkout og fraktberegning ble dokumentert.
- Vipps-flyten ble dokumentert.
- Lageroppdatering ble dokumentert.
- Ordrebekreftelser ble dokumentert.
- Bring Booking API ble verifisert i testmodus.
- Riktig Bring-kundenummer ble bekreftet som `1659671`.
- PDF-etikett, sporingsnummer og sporingslenke ble verifisert.
- Monday-oppdatering av Bring-kolonnene ble verifisert.
- Produksjonsflyten er ikke aktivert.
- `BRING_TEST_MODE` skal fortsatt være satt til `true`.