# Environment Variables

Dette dokumentet beskriver alle miljøvariabler som brukes av Eikbutikk.no.

Formålet er å:

- dokumentere hva hver variabel brukes til
- gjøre deploy enklere
- redusere risiko ved produksjonssetting
- gjøre feilsøking enklere
- sikre at miljøvariabler blir satt korrekt i både lokal utvikling og Vercel

Sist oppdatert: 13.09.2026

---

# Viktige regler

## Regel 1

Hemmelige nøkler skal aldri:

- legges i Git
- legges i dokumentasjon
- sendes på e-post
- hardkodes i kildekode

---

## Regel 2

Følgende prefiks betyr offentlig:

```env
NEXT_PUBLIC_
```

Alle variabler med dette prefikset kan leses av nettleseren.

Legg aldri hemmeligheter i slike variabler.

---

## Regel 3

Etter endring av miljøvariabler:

### Lokal utvikling

Kjør:

```text
Ctrl + C
npm run dev
```

### Vercel

- lagre variabelen
- kjør ny deploy
- verifiser at deployen bruker nye verdier

---

# 1. Bring

## BRING_API_UID

### Formål

Innloggingsbruker for Bring API.

### Eksempel

```env
BRING_API_UID=sortland@eiksenteret.com
```

### Brukes av

```text
/api/bring/create-shipment
```

---

## BRING_API_KEY

### Formål

API-nøkkel for Bring.

### Eksempel

```env
BRING_API_KEY=********
```

### Kritisk

Må aldri:

- vises offentlig
- lagres i Git
- dokumenteres med faktisk verdi

---

## BRING_API_CUSTOMER

### Formål

Kundenummer brukt i Booking API.

### Verifisert verdi

```env
BRING_API_CUSTOMER=1659671
```

### Viktig

Denne verdien fungerer:

```text
1659671
```

Denne verdien fungerer ikke i dagens bookingflyt:

```text
PARCELS_NORWAY-00001659671
```

### Brukes av

```text
/api/bring/create-shipment
```

---

## BRING_CUSTOMER_NUMBER

### Formål

Bring-kontonummer.

### Verifisert verdi

```env
BRING_CUSTOMER_NUMBER=00001659671
```

### Viktig

Denne brukes ikke som Booking API-kundenummer.

---

## BRING_CLIENT_URL

### Formål

Identifiserer klienten mot Bring.

### Verifisert verdi

```env
BRING_CLIENT_URL=https://www.eikbutikk.no
```

### Brukes av

Booking API-requester.

---

## BRING_TEST_MODE

### Formål

Styrer om Bring kjører i testmodus.

### Utvikling

```env
BRING_TEST_MODE=true
```

### Produksjon

```env
BRING_TEST_MODE=false
```

### Viktig

Ikke sett til:

```env
false
```

før produksjonssjekklisten er gjennomført.

---

## BRING_ADMIN_SECRET

### Formål

Beskytter Bring-ruter mot uautorisert bruk.

### Brukes av

```text
/api/bring/create-shipment
```

### Viktig

Må aldri:

- lagres i Git
- bruke NEXT_PUBLIC_
- vises i frontend

---

# 2. Monday

## MONDAY_API_KEY

### Formål

API-nøkkel for Monday.

### Brukes av

- ordreopprettelse
- lageroppdatering
- Bring-oppdatering
- produktsynkronisering

### Kritisk

Må aldri publiseres.

---

## MONDAY_BOARD_ID

### Formål

Produktboard.

### Brukes av

- produktvisning
- lagerstatus
- pakkedata

### Inneholder

- produkter
- lager
- vekt
- lengde
- bredde
- høyde

---

## MONDAY_ORDER_BOARD_ID

### Formål

Ordreboard.

### Verifisert verdi

```env
MONDAY_ORDER_BOARD_ID=18430730386
```

### Brukes av

- ordreopprettelse
- ordrestatus
- Bring-integrasjon

---

# 3. Vipps

## VIPPS_CLIENT_ID

### Formål

Vipps API-klient.

### Kritisk

Holdes hemmelig.

---

## VIPPS_CLIENT_SECRET

### Formål

Vipps API-klienthemmelighet.

### Kritisk

Holdes hemmelig.

---

## VIPPS_SUBSCRIPTION_KEY

### Formål

Gir tilgang til Vipps API.

### Kritisk

Holdes hemmelig.

---

## VIPPS_MSN

### Formål

Merchant Serial Number.

### Brukes av

Vipps-betalinger.

---

# 4. E-post

## RESEND_API_KEY

### Formål

API-nøkkel for Resend.

### Brukes av

- ordrebekreftelse
- butikkmail
- sporingsmail

### Kritisk

Holdes hemmelig.

---

## FROM_EMAIL

### Formål

Avsenderadresse.

### Eksempel

```env
FROM_EMAIL=butikk@eikbutikk.no
```

### Brukes av

Alle utgående e-poster.

---

# 5. Redis

## UPSTASH_REDIS_REST_URL

### Formål

Redis URL.

### Brukes av

Lagerreservasjon.

---

## UPSTASH_REDIS_REST_TOKEN

### Formål

Redis autentisering.

### Kritisk

Holdes hemmelig.

---

# 6. Frontend

## NEXT_PUBLIC_BASE_URL

### Formål

Produksjonsdomene.

### Verifisert verdi

```env
NEXT_PUBLIC_BASE_URL=https://www.eikbutikk.no
```

### Brukes av

- Vipps-retur
- e-postlenker
- API-lenker

### Tidligere feil

Feil verdi førte til:

- kunden havnet på forsiden
- vipps_order manglet
- complete-payment ble ikke kalt

---

## NEXT_PUBLIC_SITE_NAME

### Formål

Navn på nettstedet.

### Eksempel

```env
NEXT_PUBLIC_SITE_NAME=Eikbutikk
```

---

# 7. Miljøer

## Lokal utvikling

Fil:

```text
.env.local
```

### Brukes av

```text
npm run dev
```

---

## Produksjon

Lagringssted:

```text
Vercel Environment Variables
```

### Viktig

Miljøvariabler skal være identiske mellom:

- lokal utvikling
- Vercel Preview
- Vercel Production

med unntak av:

```env
BRING_TEST_MODE
```

---

# 8. Produksjonskritiske variabler

Følgende må kontrolleres før enhver produksjonssetting:

```env
BRING_API_UID
```

```env
BRING_API_KEY
```

```env
BRING_API_CUSTOMER
```

```env
BRING_TEST_MODE
```

```env
MONDAY_API_KEY
```

```env
MONDAY_ORDER_BOARD_ID
```

```env
VIPPS_CLIENT_ID
```

```env
VIPPS_CLIENT_SECRET
```

```env
VIPPS_SUBSCRIPTION_KEY
```

```env
RESEND_API_KEY
```

```env
NEXT_PUBLIC_BASE_URL
```

---

# 9. Produksjonsklar når

Følgende er bekreftet:

- [ ] Alle variabler finnes lokalt.
- [ ] Alle variabler finnes i Vercel.
- [ ] Bring API-nøkkel er rotert etter tidligere eksponering.
- [ ] BRING_API_CUSTOMER=1659671
- [ ] BRING_TEST_MODE=false
- [ ] Vercel er deployet på nytt.
- [ ] Vipps fungerer.
- [ ] Monday fungerer.
- [ ] Bring fungerer.
- [ ] Resend fungerer.
- [ ] Første ekte ordre er testet.

---

# 10. Hurtig feilsøking

## Bring avviser booking

Kontroller:

```env
BRING_API_CUSTOMER=1659671
```

og:

```env
BRING_API_UID
```

```env
BRING_API_KEY
```

```env
BRING_CLIENT_URL
```

---

## Monday fungerer ikke

Kontroller:

```env
MONDAY_API_KEY
```

```env
MONDAY_ORDER_BOARD_ID
```

---

## Vipps fungerer ikke

Kontroller:

```env
VIPPS_CLIENT_ID
```

```env
VIPPS_CLIENT_SECRET
```

```env
VIPPS_SUBSCRIPTION_KEY
```

```env
NEXT_PUBLIC_BASE_URL
```

---

## E-post fungerer ikke

Kontroller:

```env
RESEND_API_KEY
```

```env
FROM_EMAIL
```

---

# 11. Endringslogg

## 13.09.2026

- Bring Booking API verifisert.
- Korrekt kundenummer dokumentert som 1659671.
- Monday-integrasjon dokumentert.
- Vipps-integrasjon dokumentert.
- Resend dokumentert.
- Redis dokumentert.
- Produksjonskritiske variabler dokumentert.