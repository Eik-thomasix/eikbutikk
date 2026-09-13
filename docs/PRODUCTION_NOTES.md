# Production Notes

Dette dokumentet inneholder viktige erfaringer, beslutninger og kontrollpunkter som må tas hensyn til før produksjonssetting av Eikbutikk.no.

Dokumentet er ment som et supplement til:

- BRING_GO_LIVE_CHECKLIST.md
- MONDAY_STRUCTURE.md
- ORDER_FLOW.md
- KNOWN_ISSUES.md

Sist oppdatert: 13.09.2026

---

# Hovedregel

Ikke aktiver produksjonsmodus før:

```env
BRING_TEST_MODE=true
```

kan endres til:

```env
BRING_TEST_MODE=false
```

uten at det finnes kjente åpne feil.

Produksjonssetting skal gjennomføres kontrollert og dokumenteres.

---

# Viktige beslutninger

## Bring Booking API

Følgende kundenummer fungerer:

```text
1659671
```

Følgende kundenummer fungerer ikke for gjeldende bookingflyt:

```text
PARCELS_NORWAY-00001659671
```

Booking API skal bruke:

```text
customerNumber=1659671
```

---

## Bring-tjeneste

Gjeldende tjeneste:

```text
5800
```

Denne ble brukt i vellykket testbooking.

---

## Sendingsflyt

Bring-booking skal ikke opprettes automatisk ved betaling.

Beslutning:

Sending skal opprettes manuelt av medarbeider når:

- varen er pakket
- varen er kontrollert
- adressen er kontrollert
- pakkemålene er kontrollert

Dette reduserer risikoen for feilforsendelser.

---

## Henting i butikk

Produkter som er definert som:

```text
Henting i butikk
```

skal aldri opprette Bring-sending.

Disse skal håndteres separat.

---

# Verifiserte integrasjoner

## Vipps

Verifisert:

- betaling opprettes
- retur fungerer
- ordre oppdateres
- lager oppdateres
- ordre flyttes til Behandles

Status:

```text
Godkjent
```

---

## Monday

Verifisert:

- ordre opprettes
- ordre oppdateres
- lager oppdateres
- Bring-kolonner kan oppdateres

Status:

```text
Godkjent
```

---

## Bring

Verifisert:

- innlogging
- API-nøkkel
- kundenummer
- booking
- PDF-etikett
- sporingsnummer
- sporingslenke

Status:

```text
Godkjent
```

---

## E-post

Verifisert:

- Resend fungerer
- ordrebekreftelse fungerer
- butikkmail fungerer

Status:

```text
Delvis ferdig
```

Manglende punkt:

```text
Varen er sendt
```

---

# Ting som må ryddes før produksjon

## Testordrer

Fjern eller arkiver:

```text
EIK-07014172
```

og andre testordre.

---

## Test-sporingsnummer

Fjern:

```text
TEST-TRACKING-12345
```

fra Monday.

---

## Test-PDF

Fjern:

```text
https://example.com/test-label.pdf
```

fra aktive ordre.

---

## Bring-testsendinger

Dokumenter eventuelle testsendinger som er opprettet under utvikling.

Eksempler:

```text
70722152774800992
```

```text
70722152774843388
```

Disse skal ikke behandles som reelle kundeordre.

---

## API-nøkler

Bring API-nøkkel har tidligere vært eksponert.

Før produksjon skal:

- ny Bring API-nøkkel opprettes
- gammel nøkkel fjernes
- lokal miljøfil oppdateres
- Vercel oppdateres

---

# Første produksjonssending

Den første ekte sendingen skal behandles manuelt.

Kontroller følgende:

- kundenavn
- adresse
- postnummer
- telefon
- e-post
- produkt
- vekt
- pakkemål
- sporingsnummer
- PDF

før etiketten skrives ut.

---

## Etter booking

Kontroller at:

- sporingsnummer er lagret i Monday
- PDF-lenken fungerer
- sendingsdato er lagret
- ordrestatus er korrekt
- ordren ligger i Sendt / Hentet

---

## Etter utsendelse

Kontroller at:

- kunden mottok e-post
- sporingslenken fungerer
- Bring viser sendingen korrekt

---

# Produksjonskonfigurasjon

## Skal være TRUE under utvikling

```env
BRING_TEST_MODE=true
```

---

## Skal være FALSE i produksjon

```env
BRING_TEST_MODE=false
```

---

## Etter endring

Følg alltid:

1. Lagre miljøvariabel.
2. Deploy på nytt.
3. Verifiser deploy.
4. Kjør én kontrollert test.

---

# Risikoer

## Risiko 1

Produkt mangler vekt.

Konsekvens:

Bring-booking stopper.

Tiltak:

Kontroller alle pakkedata.

---

## Risiko 2

Produkt mangler mål.

Konsekvens:

Bring-booking stopper.

Tiltak:

Kontroller alle produkter.

---

## Risiko 3

Dobbeltbooking.

Konsekvens:

To forsendelser opprettes.

Tiltak:

Kontroller at:

```text
text_mm75q5sa
```

alltid sjekkes før booking.

---

## Risiko 4

Dobbelt lagertrekk.

Konsekvens:

Feil lagerbeholdning.

Tiltak:

Kontroller at:

```text
stockUpdated
```

fortsatt brukes som sperre.

---

## Risiko 5

Doble e-poster.

Konsekvens:

Kunden mottar flere bekreftelser.

Tiltak:

Verifiser idempotens før produksjon.

---

# Åpne oppgaver

## Høy prioritet

- Bygge e-post: "Varen er sendt"
- Verifisere automatisk flytting til Sendt / Hentet
- Verifisere sporingslenke i e-post
- Verifisere første ekte Bring-sending

---

## Middels prioritet

- Lage bedre adminside for Bring
- Fjerne teknisk JSON fra testside
- Vise ordreinformasjon før booking

---

## Lav prioritet

- Historikk over sentrale Bring-hendelser
- Logging av hvem som oppretter sending
- Intern statistikk for utsendelser

---

# Produksjonsklar når

Alle punkter er oppfylt:

- [ ] BRING_GO_LIVE_CHECKLIST.md er fullført
- [ ] Testdata er fjernet
- [ ] API-nøkler er kontrollert
- [ ] E-post "Varen er sendt" fungerer
- [ ] Sendt / Hentet fungerer
- [ ] Første ekte sending er gjennomført
- [ ] Første ekte sporingsmail er sendt
- [ ] Første Bring-faktura er kontrollert
- [ ] BRING_TEST_MODE=false er aktivert
- [ ] Vercel er deployet på nytt

Når alle disse punktene er oppfylt kan Bring-flyten anses som produksjonsklar.