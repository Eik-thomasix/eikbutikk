# Known Issues

Dette dokumentet beskriver kjente feil, fallgruver, testbegrensninger og viktige erfaringer fra utviklingen av Eikbutikk.no.

Formålet er å:

- unngå at tidligere feil introduseres på nytt
- gjøre feilsøking raskere
- holde kontroll på testdata
- sikre en trygg overgang til produksjon

Sist oppdatert: 13.09.2026

---

# 1. Bring Booking API

## 1.1 Feil kundenummer ved booking

### Status

Løst.

### Første feilmelding

```text
BOOK-INPUT-021
Invalid customer number
```

### Årsak

Booking-requesten brukte:

```text
00001659671
```

Dette kundenummeret ble avvist av Bring Booking API for tjenesten som ble testet.

### Andre test

Følgende API-kundenummer ble også testet:

```text
PARCELS_NORWAY-00001659671
```

Dette ga feilen:

```text
BOOK_VALIDATION-017
Main customer number must be used for this service
```

### Korrekt løsning

Bring Booking API med tjenestekode `5800` fungerte med:

```text
customerNumber: 1659671
```

Miljøvariabelen skal derfor være:

```env
BRING_API_CUSTOMER=1659671
```

### Viktig

Ikke endre denne til:

```env
BRING_API_CUSTOMER=PARCELS_NORWAY-00001659671
```

uten at en annen Bring-tjeneste eksplisitt krever dette.

---

## 1.2 Ugyldig connectivity-endepunkt

### Status

Løst.

### Feilmelding

```text
404 Not Found
No endpoint GET /booking/api/v1/ping
```

### Årsak

Følgende endepunkt finnes ikke:

```text
GET /booking/api/v1/ping
```

### Løsning

Bring-tilkoblingen ble i stedet verifisert med en booking-request i testmodus mot:

```text
POST /booking/api/create
```

### Resultat

Bring returnerte:

- forsendelsesnummer
- pakkenummer
- sporingsnummer
- sporingslenke
- PDF-etikett

---

## 1.3 Bring-testmodus

### Status

Aktiv under utvikling.

Følgende miljøvariabel skal beholdes under utvikling:

```env
BRING_TEST_MODE=true
```

Dette medfører at headeren:

```text
X-Bring-Test-Indicator: true
```

sendes til Bring.

### Viktig

Ikke sett:

```env
BRING_TEST_MODE=false
```

før produksjonssjekklisten er gjennomgått.

Unngå unødvendige gjentatte kall til Bring, også i testmodus.

---

## 1.4 Bring-test oppdaterer ikke Monday

### Status

Forventet oppførsel.

Når:

```env
BRING_TEST_MODE=true
```

er aktivert, kan `create-shipment` opprette en testsending hos Bring uten å:

- fylle ut sporingsnummer i Monday
- fylle ut sendingsdato
- lagre PDF-lenke
- flytte ordren til «Sendt / Hentet»
- sende kunden e-post om utsendelse

### Forventet API-respons

```json
{
  "success": true,
  "testMode": true,
  "mondayUpdated": false
}
```

Dette er korrekt og skal ikke tolkes som en feil.

---

## 1.5 PDF-etiketten kan bruke redirect

### Status

Kjent oppførsel.

Bring returnerer en HTTPS-lenke til PDF-etiketten. Når lenken åpnes, kan Bring videresende forespørselen til en annen lagringsadresse.

### Kontrollpunkt

Kontroller alltid at:

```text
Åpne Bring-etikett
```

åpner en gyldig PDF før sendingen behandles videre.

---

## 1.6 Dobbeltbooking må forhindres

### Status

Beskyttelse implementert i `create-shipment`.

Før en booking opprettes, kontrollerer API-ruten om ordren allerede har et sporingsnummer i:

```text
text_mm75q5sa
```

Hvis sporingsnummer finnes, skal ordren ikke bookes på nytt.

### Forventet respons

```json
{
  "success": true,
  "alreadyBooked": true
}
```

### Viktig

Ikke slett sporingsnummeret på en ekte ordre og kjør booking på nytt uten først å kontrollere sendingen i Mybring.

---

# 2. Bring-konfigurasjon

## 2.1 Nødvendige miljøvariabler

Følgende miljøvariabler må finnes:

```env
BRING_API_UID
BRING_API_KEY
BRING_API_CUSTOMER
BRING_CUSTOMER_NUMBER
BRING_CLIENT_URL
BRING_TEST_MODE
BRING_ADMIN_SECRET
```

### Verifiserte ikke-hemmelige verdier

```env
BRING_API_UID=sortland@eiksenteret.com
BRING_API_CUSTOMER=1659671
BRING_CUSTOMER_NUMBER=00001659671
BRING_CLIENT_URL=https://www.eikbutikk.no
BRING_TEST_MODE=true
```

### Hemmelige verdier

Følgende verdier skal aldri skrives i dokumentasjon eller kildekode:

```env
BRING_API_KEY
BRING_ADMIN_SECRET
```

Disse skal bare ligge i:

- `.env.local`
- Vercel Environment Variables

---

## 2.2 Bring API-nøkkel har vært delt i klartekst

### Status

Sikkerhetstiltak må gjennomføres før produksjon.

En Bring API-nøkkel har tidligere blitt delt i en samtale.

### Tiltak

- Opprett en ny API-nøkkel i Mybring.
- Slett eller tilbakekall den gamle nøkkelen.
- Oppdater `.env.local`.
- Oppdater Vercel Environment Variables.
- Kjør en ny Vercel-deploy.
- Test Bring-integrasjonen med den nye nøkkelen.

### API-nøkler skal aldri

- lagres i Git
- hardkodes i kildekode
- skrives i dokumentasjon
- vises i API-responser
- bruke prefikset `NEXT_PUBLIC_`

---

## 2.3 `BRING_CLIENT_URL` så feil ut i kopiert JSON

### Status

Ikke en faktisk feil.

Kopiert JSON så ut til å inneholde HTML- eller lenkeformatering rundt URL-en.

En kontroll av råverdien viste:

```json
{
  "rawClientUrl": "https://www.eikbutikk.no",
  "length": 24
}
```

Dette bekreftet at miljøvariabelen var korrekt.

### Læringspunkt

Ikke endre miljøvariabler bare på grunnlag av formattert tekst kopiert fra nettleser eller chat. Kontroller råverdi og lengde først.

---

# 3. Monday-integrasjon

## 3.1 Verifiserte Bring-kolonner

Følgende ordreboard-kolonner er verifisert:

```text
Sporingsnummer
text_mm75q5sa
```

```text
Sendingsdato
date_mm75z9jw
```

```text
Bring PDF
link_mm75mrj7
```

Monday update-testen har bekreftet at alle tre kan oppdateres fra API-et.

---

## 3.2 Verifisert ordreboard

```text
MONDAY_ORDER_BOARD_ID=18430730386
```

---

## 3.3 Verifisert sluttgruppe

```text
Sendt / Hentet
group_mm73mky8
```

Produksjonsflyten skal flytte en postsendingsordre hit etter at Bring-booking og Monday-oppdatering er fullført.

---

## 3.4 Monday så ikke oppdatert ut på grunn av nettlesercache

### Status

Løst.

### Symptom

Monday-testen returnerte suksess, men de oppdaterte verdiene var ikke synlige med én gang.

### Årsak

Nettleseren viste gammel informasjon.

### Løsning

Utfør en hard oppdatering:

```text
Ctrl + Shift + R
```

eller:

```text
Shift + klikk på Oppdater
```

### Læringspunkt

Kontroller API-responsen før det konkluderes med at Monday-oppdateringen har feilet.

---

## 3.5 HTTP 405 ved direkte åpning av test-update

### Status

Forventet oppførsel.

### Feilmelding

```text
HTTP 405
Method Not Allowed
```

### Årsak

Denne adressen ble åpnet direkte i nettleseren:

```text
/api/monday/test-update
```

Nettleseren sender en `GET`-forespørsel, mens API-ruten bare støtter:

```text
POST
```

### Løsning

Bruk knappen:

```text
Test Monday-oppdatering
```

på testsiden:

```text
/bring-test
```

---

## 3.6 Testdata i Monday må fjernes

### Status

Åpent før produksjonssetting.

Monday-testen skriver inn:

```text
TEST-TRACKING-12345
```

og:

```text
https://example.com/test-label.pdf
```

### Før produksjon

- Fjern `TEST-TRACKING-12345`.
- Fjern test-PDF-lenken.
- Fjern eller arkiver testordren.
- Søk i ordreboardet etter `TEST-TRACKING`.
- Kontroller at aktive ordre ikke inneholder eksempeldata.

---

# 4. Produktdata og pakkemål

## 4.1 Nødvendige produktkolonner

Følgende kolonner brukes ved Bring-booking:

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

---

## 4.2 Manglende pakkedata blokkerer booking

### Status

Forventet validering.

Bring-booking skal stoppes dersom ett eller flere av følgende felter mangler eller er `0`:

- vekt
- lengde
- bredde
- høyde

### Forventet feilmelding

```text
Produktet mangler vekt eller pakkemål i Monday.
```

### Løsning

Fyll ut alle pakkefeltene på produktboardet før Bring-etiketten genereres.

---

## 4.3 Produkter over 70 kg

### Status

Begrensning i nåværende løsning.

Produkter over 70 kg skal ikke bookes med den nåværende pakketjenesten.

### Forventet håndtering

Ordren skal behandles som:

```text
Henting i butikk
```

eller senere sendes via en egen løsning for gods eller større forsendelser.

### Viktig

Ikke fjern vektkontrollen uten å velge riktig Bring-tjeneste for tyngre gods.

---

## 4.4 Produktvekt må kontrolleres

### Status

Operativt kontrollpunkt.

Det har tidligere vært forskjell mellom vekten i Monday og vekten i produktbeskrivelsen.

### Eksempel

```text
Vekt i Monday: 30 kg
Vekt i produktbeskrivelse: ca. 61 kg
```

### Risiko

Feil vekt eller mål kan føre til:

- feil fraktpris mot kunden
- feil transportbestilling
- etterfakturering
- avvist sending
- feil håndtering av pakken

### Tiltak

Før produksjon skal vekt og pakkemål kontrolleres for alle produkter som kan sendes.

---

# 5. Fraktberegning

## 5.1 Faste fraktpriser

Følgende priser brukes i checkout:

```text
0 til 10 kg: 199 kr
Over 10 til 25 kg: 299 kr
Over 25 til 35 kg: 399 kr
Over 35 til 70 kg: 899 kr
Over 70 kg: Kun henting
```

### Viktig

Dette er butikkens faste priser mot kunden. Prisene er ikke nødvendigvis identiske med det Bring fakturerer.

Differansen mellom kundepris og faktisk transportkostnad må følges opp etter produksjonssetting.

---

## 5.2 Frakt kom ikke med i Vipps-kontrollen

### Status

Løst.

### Symptom

Vipps-betalingen gikk gjennom, men:

- lageret ble ikke oppdatert
- ordren ble stående i «Venter på betaling»
- ordren ble ikke flyttet til «Behandles»
- ordrebekreftelsen ble ikke vist

### Årsak

`complete-payment` sammenlignet Vipps-beløpet med bare:

```text
salePrice
```

Vipps hadde belastet:

```text
salePrice + shippingPrice
```

### Løsning

Forventet beløp beregnes nå fra:

```text
totalPrice
```

med fallback til:

```text
salePrice + shippingPrice
```

---

## 5.3 Kunde-e-post viste ikke frakt

### Status

Løst i oppdatert checkout-route.

### Symptom

Vipps belastet varepris og frakt, men kundens ordrebekreftelse viste bare vareprisen som «Totalt betalt».

### Løsning

Kundemail og butikkmail viser nå:

- varepris
- frakt
- totalt betalt
- ordrenummer
- leveringsmetode

### Testmodus

Begge e-postene sendes foreløpig til:

```text
thomasix@gmail.com
```

---

# 6. Vipps-retur og produksjonsdomene

## 6.1 Kunden ble sendt direkte til forsiden etter betaling

### Status

Løst.

### Symptom

På localhost fungerte ferdigbehandlingen.

På produksjonsnettstedet ble kunden sendt direkte til:

```text
https://www.eikbutikk.no/
```

i stedet for produktsiden med:

```text
?vipps_order=EIK-...
```

### Konsekvens

`complete-payment` ble aldri kalt.

Dermed ble ikke:

- lageret oppdatert
- ordren flyttet til «Behandles»
- ordrebekreftelsen vist
- e-postene sendt

### Årsak

`NEXT_PUBLIC_BASE_URL` hadde feil format i Vercel.

### Løsning

Miljøvariabelen ble rettet til:

```env
NEXT_PUBLIC_BASE_URL=https://www.eikbutikk.no
```

Deretter ble det kjørt en ny Vercel-deploy.

---

## 6.2 Miljøvariabler krever restart eller ny deploy

### Etter endring av `.env.local`

Kjør:

```text
Ctrl + C
npm run dev
```

### Etter endring i Vercel

- Lagre miljøvariabelen.
- Kjør Redeploy eller en ny deploy.
- Kontroller at siste deployment bruker de oppdaterte verdiene.

### Vanlige symptomer på gammel konfigurasjon

- localhost fungerer, men produksjon fungerer ikke
- gamle API-verdier brukes
- feil returadresse etter Vipps
- Bring bruker feil kundenummer

---

# 7. Next.js og nettlesercache

## 7.1 API-route bruker gammel kode etter filbytte

### Status

Kjent utviklingsproblem.

### Symptom

Frontend viser nye endringer, men API-ruten oppfører seg som før.

### Løsning

Restart Next.js:

```text
Ctrl + C
npm run dev
```

Utfør ved behov også hard refresh:

```text
Ctrl + Shift + R
```

---

## 7.2 Tekst ble lagt direkte i `page.tsx`

### Status

Løst.

### Symptom

Følgende tekst ble lagt direkte inn i en TSX-fil:

```text
Ordrenummer
[EIK-07014172]

[Kjør Bring-test]
```

TypeScript forsøkte å tolke teksten som kode.

### Feilmelding

```text
Legacy octal literals are not available when targeting ECMAScript 5 and higher
```

### Løsning

`src/app/bring-test/page.tsx` ble erstattet med en komplett React-komponent.

---

# 8. Testside og sikkerhet

## 8.1 `/bring-test` er ikke en ferdig adminløsning

### Status

Åpent.

Testsiden:

```text
/bring-test
```

er laget for utvikling og kontroll.

Den er ikke en ferdig produksjonsklar administrasjonsside.

### Før produksjon må følgende vurderes

- autentisering av ansatte
- begrensning av tilgang
- bekreftelse før en sending opprettes
- visning av kunde, adresse, produkt og pakkemål før booking
- logging av hvem som opprettet sendingen
- skjuling eller fjerning av teknisk JSON
- sikring eller fjerning av testsiden

---

## 8.2 `BRING_ADMIN_SECRET` skal ikke være offentlig

### Status

Implementert som serverhemmelighet.

`BRING_ADMIN_SECRET` skal aldri:

- bruke prefikset `NEXT_PUBLIC_`
- hardkodes i `page.tsx`
- lagres i Git
- vises i API-responser
- skrives i dokumentasjonen

Testsiden ber brukeren skrive inn hemmeligheten og sender den i:

```text
x-admin-secret
```

Dette er en midlertidig testløsning.

---

# 9. E-post og testmodus

## 9.1 Alle test-e-poster sendes til testadresse

### Status

Bevisst testoppsett.

Kunde- og butikkmail sendes foreløpig til:

```text
thomasix@gmail.com
```

### Før produksjon

- Kundemail må sendes til `customer.email`.
- Butikkmail må sendes til valgt intern mottaker.
- Testmerking i emnefeltet må fjernes.
- Testtekst nederst i kundemailen må fjernes.

---

## 9.2 E-post «Varen er sendt» mangler

### Status

Ikke ferdigstilt.

Etter vellykket Bring-booking skal kunden få en e-post som inneholder:

- ordrenummer
- produkt
- sporingsnummer
- sporingslenke
- beskjed om at varen er sendt
- kontaktinformasjon til Eiksenteret Sortland

E-posten skal bygges og testes mens:

```env
BRING_TEST_MODE=true
```

---

## 9.3 E-postfeil og idempotens

### Status

Må kontrolleres før produksjon.

Hvis e-postutsending feiler etter lageroppdatering eller Bring-booking, må en retry ikke:

- trekke lageret på nytt
- opprette en ny Bring-sending
- flytte ordren flere ganger
- sende flere kundemails

### Krav

- Lager trekkes maksimalt én gang.
- Bring-sending opprettes maksimalt én gang.
- Ordren flyttes maksimalt én gang.
- E-post bør ikke dupliseres ved retry.

---

# 10. Testdata som må ryddes

## Kjente testdata

```text
Testordre:
EIK-07014172
```

```text
Test-sporingsnummer:
TEST-TRACKING-12345
```

```text
Test-PDF:
https://example.com/test-label.pdf
```

### Kjente Bring-testsendinger

```text
70722152774800992
70722152774843388
```

Flere testsendinger kan ha blitt opprettet under utviklingen.

### Før produksjon

- Fjern test-sporingsnummer fra Monday.
- Fjern test-PDF-lenker.
- Arkiver eller slett testordrer.
- Dokumenter testsendingene.
- Kontroller at testsendinger ikke behandles som ekte sendinger.
- Kontroller at testdata ikke inngår i statistikk eller rapportering.

---

# 11. Åpne punkter før produksjon

- [ ] Rydde testverdier fra Monday.
- [ ] Rydde eller arkivere testordrer.
- [ ] Dokumentere testsendingene hos Bring.
- [ ] Erstatte tidligere eksponert Bring API-nøkkel.
- [ ] Verifisere automatisk flytting til «Sendt / Hentet».
- [ ] Bygge e-post «Varen er sendt».
- [ ] Inkludere sporingslenke i kundemail.
- [ ] Konfigurere reelle e-postmottakere.
- [ ] Kontrollere vekt og mål på alle produkter som kan sendes.
- [ ] Sikre eller fjerne `/bring-test`.
- [ ] Verifisere idempotens for lager, Bring og e-post.
- [ ] Holde `BRING_TEST_MODE=true` under utvikling.
- [ ] Sette `BRING_TEST_MODE=false` først ved produksjonssetting.
- [ ] Kjør ny Vercel-deploy etter endring av testmodus.
- [ ] Gjennomføre én kontrollert, ekte forsendelse.
- [ ] Kontrollere første faktura fra Bring mot faste fraktpriser.

---

# 12. Produksjonsregel

Ikke sett:

```env
BRING_TEST_MODE=false
```

før alle kritiske punkter i:

```text
docs/BRING_GO_LIVE_CHECKLIST.md
```

er gjennomgått.

Ved første produksjonssending skal følgende kontrolleres manuelt:

1. Ordren er betalt.
2. Ordren ligger i «Behandles».
3. Leveringsmetoden er Postsending.
4. Kundenavn og adresse er korrekte.
5. Telefonnummer og e-post er korrekte.
6. Produktet har riktig vekt.
7. Produktet har riktige pakkemål.
8. Bring-etiketten viser riktig mottaker.
9. Sporingsnummeret lagres i Monday.
10. PDF-lenken fungerer.
11. Sendingsdatoen er korrekt.
12. Ordren flyttes til «Sendt / Hentet».
13. Kunden mottar korrekt sporingsmail.
14. Ny sending opprettes ikke hvis knappen trykkes på nytt.

---

# 13. Hurtig feilsøking

## Bring avviser bookingen

Kontroller i denne rekkefølgen:

1. `BRING_API_CUSTOMER=1659671`
2. `BRING_API_UID` er korrekt.
3. `BRING_API_KEY` er gyldig.
4. `BRING_CLIENT_URL` er korrekt.
5. `BRING_TEST_MODE` har forventet verdi.
6. Produktet har vekt og pakkemål.
7. Ordren er markert som Betalt.
8. Leveringsmetoden er Postsending.
9. Ordren ikke allerede har sporingsnummer.

---

## Monday oppdateres ikke

Kontroller:

1. `MONDAY_API_KEY`
2. `MONDAY_ORDER_BOARD_ID=18430730386`
3. At kolonne-ID-ene er korrekte.
4. At ordrenummeret finnes.
5. Teknisk svar på `/bring-test`.
6. Vercel- eller terminalloggen.
7. Hard refresh i nettleseren.

---

## Vipps-ordre blir stående i «Venter på betaling»

Kontroller:

1. Returadressen etter Vipps.
2. At `vipps_order` finnes i URL-en.
3. Vercel-logg for `/api/vipps/complete-payment`.
4. At forventet beløp inkluderer frakt.
5. At Vercel bruker siste deployment.
6. At `NEXT_PUBLIC_BASE_URL` er korrekt.

---

# 14. Verifiserte tekniske referanser

```text
Order board:
18430730386
```

```text
Sendt / Hentet:
group_mm73mky8
```

```text
Sporingsnummer:
text_mm75q5sa
```

```text
Sendingsdato:
date_mm75z9jw
```

```text
Bring PDF:
link_mm75mrj7
```

```text
Vekt:
numeric_mm75drw8
```

```text
Lengde:
numeric_mm75t3qf
```

```text
Bredde:
numeric_mm75mdjp
```

```text
Høyde:
numeric_mm75vbef
```

```text
Bring Booking customer number:
1659671
```

```text
Bring service:
5800
```

```text
Bring testside:
/bring-test
```

```text
Bring create-shipment API:
/api/bring/create-shipment
```

```text
Monday update-test API:
/api/monday/test-update
```

---

# 15. Endringslogg

## 13.09.2026

- Bring Booking API ble verifisert i testmodus.
- Riktig kundenummer ble identifisert som `1659671`.
- Tjenestekode `5800` ble testet.
- PDF-etikett ble generert.
- Sporingsnummer ble generert.
- Sporingslenke ble generert.
- Monday-oppdatering av Bring-kolonnene ble verifisert.
- Nettlesercache ble identifisert som årsak til at en vellykket Monday-oppdatering ikke var synlig umiddelbart.
- Vipps-retur på produksjonsdomenet ble rettet.
- Frakt ble inkludert i Vipps-beløpet.
- Frakt ble inkludert i ordrebekreftelsene.
- Produksjonssetting av Bring er ikke gjennomført.
- `BRING_TEST_MODE` skal fortsatt være `true`.