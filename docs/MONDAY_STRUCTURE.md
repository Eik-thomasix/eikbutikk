# Monday Structure

Dette dokumentet beskriver strukturen i Eikbutikks Monday-oppsett.

Formålet er å:

- dokumentere alle viktige board-ID-er
- dokumentere alle viktige kolonne-ID-er
- gjøre feilsøking enklere
- gjøre videre utvikling enklere
- redusere risiko ved fremtidige endringer

Sist oppdatert: 13.09.2026

---

# 1. Order Board

## Board ID

```text
18430730386
```

### Beskrivelse

Hovedboard for ordre opprettet fra:

```text
www.eikbutikk.no
```

Alle kjøp opprettes her etter gjennomført Vipps-betaling.

---

# 2. Grupper

## Venter på betaling

### Formål

Nye ordre opprettes her.

Ordren ligger her inntil:

- betaling er bekreftet
- Vipps-retur er behandlet
- lager er justert

---

## Behandles

### Formål

Ordren flyttes hit etter vellykket:

```text
/api/vipps/complete-payment
```

Ordren er nå klar for:

- pakking
- Bring-bestilling
- utsendelse

---

## Sendt / Hentet

### Group ID

```text
group_mm73mky8
```

### Formål

Ordren flyttes hit når:

- Bring-etikett er opprettet
- sporingsnummer finnes
- sendingsdato er registrert

eller:

- kunden har hentet varen

---

# 3. Bring-kolonner

## Sporingsnummer

### Kolonne-ID

```text
text_mm75q5sa
```

### Beskrivelse

Lagrer sporingsnummer fra Bring.

### Eksempel

```text
370722152604497638
```

### Oppdateres av

```text
/api/bring/create-shipment
```

---

## Sendingsdato

### Kolonne-ID

```text
date_mm75z9jw
```

### Beskrivelse

Dato for når sendingen opprettes.

### Format

```text
YYYY-MM-DD
```

### Eksempel

```text
2026-09-13
```

---

## Bring PDF

### Kolonne-ID

```text
link_mm75mrj7
```

### Beskrivelse

Lenke til Bring-etikett.

### Eksempel

```text
https://api.bring.com/labels/id/...
```

### Oppdateres av

```text
/api/bring/create-shipment
```

---

# 4. Ordrekolonner

## Ordrenummer

### Kolonne-ID

```text
text_mm73e37c
```

### Beskrivelse

Unikt ordrenummer.

### Eksempel

```text
EIK-07014172
```

---

## Produkt JSON

### Kolonne-ID

```text
long_text_mm73r6vx
```

### Beskrivelse

Inneholder komplett ordredata.

Lagrer blant annet:

- produkt
- kunde
- adresse
- leveringsmåte
- e-post
- telefon

### Kilde

Opprettes av checkout-systemet.

---

# 5. Produktboard

## Formål

Lagrer alle produkter som selges i nettbutikken.

Brukes blant annet av:

- lagerstyring
- checkout
- fraktberegning
- Bring-integrasjon

---

# 6. Produktkolonner brukt av Bring

## Vekt

### Kolonne-ID

```text
numeric_mm75drw8
```

### Enhet

```text
kg
```

### Eksempel

```text
15
```

---

## Lengde

### Kolonne-ID

```text
numeric_mm75t3qf
```

### Enhet

```text
cm
```

### Eksempel

```text
60
```

---

## Bredde

### Kolonne-ID

```text
numeric_mm75mdjp
```

### Enhet

```text
cm
```

### Eksempel

```text
40
```

---

## Høyde

### Kolonne-ID

```text
numeric_mm75vbef
```

### Enhet

```text
cm
```

### Eksempel

```text
50
```

---

# 7. Dokumenterte fraktgrenser

## Pakkepost

```text
0 - 10 kg
199 kr
```

```text
10 - 25 kg
299 kr
```

```text
25 - 35 kg
399 kr
```

```text
35 - 70 kg
899 kr
```

---

## Over 70 kg

### Håndtering

```text
Kun henting
```

Produkter over 70 kg skal ikke sendes gjennom dagens Bring-flyt.

---

# 8. Verifiserte tester

## Bring Booking API

Status:

```text
Bestått
```

Verifisert:

- API-nøkkel
- kundenummer
- etikettgenerering
- sporingsnummer
- sporingslenke

---

## Monday update test

Status:

```text
Bestått
```

Verifisert:

- text_mm75q5sa
- date_mm75z9jw
- link_mm75mrj7

kan oppdateres via API.

---

# 9. API-ruter

## Bring opprett sending

```text
/api/bring/create-shipment
```

### Ansvar

- henter ordre
- henter produktdata
- oppretter Bring-sending
- oppdaterer Monday
- flytter ordre

---

## Bring test

```text
/bring-test
```

### Ansvar

- testing av Bring
- testing av Monday
- tekniske API-svar

### Viktig

Ikke en produksjonsklar adminside.

---

## Monday update test

```text
/api/monday/test-update
```

### Formål

Tester at Monday kan oppdateres.

### Oppdaterer

```text
text_mm75q5sa
date_mm75z9jw
link_mm75mrj7
```

uten å opprette Bring