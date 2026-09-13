# Bring Go Live

## Testet og verifisert

- [x] Bring Booking API fungerer
- [x] Kundenummer 1659671 fungerer
- [x] PDF-etikett genereres
- [x] Sporingsnummer genereres
- [x] Sporingslenke genereres
- [x] Monday oppdaterer sporingsnummer
- [x] Monday oppdaterer sendingsdato
- [x] Monday oppdaterer Bring PDF

## Testdata som må fjernes

- [ ] TEST-TRACKING-12345
- [ ] Test-PDF-lenker
- [ ] Testordrer
- [ ] Eventuelle testsendinger

## Før produksjon

- [ ] BRING_TEST_MODE=false
- [ ] Verifiser e-post til kunde
- [ ] Verifiser flytting til Sendt/Hentet
- [ ] Test én ekte ordre

## Produksjon

- [ ] Første ekte forsendelse opprettet
- [ ] Trackingnummer lagret i Monday
- [ ] PDF lagret i Monday
- [ ] Kunde mottok sporingsmail

# Bring Go Live Checklist

## Verifisert

- [x] Bring Booking API fungerer
- [x] Kundenummer 1659671 fungerer
- [x] Sporingsnummer genereres
- [x] PDF-etikett genereres
- [x] Sporingslenke genereres
- [x] Monday oppdatering fungerer
- [x] Bring-testside fungerer

## Testdata som må fjernes

- [ ] TEST-TRACKING-12345
- [ ] Test-PDF-lenker
- [ ] Testsendinger hos Bring
- [ ] Testordrer i Monday

## Før produksjon

- [ ] Automatisk flytting til Sendt / Hentet
- [ ] Kundemail "Varen er sendt"
- [ ] Verifisere sporingslenke i e-post
- [ ] Verifisere PDF-lenke i Monday

## Produksjonssetting

- [ ] BRING_TEST_MODE=false
- [ ] Gjennomføre én ekte sending
- [ ] Kontrollere faktiske Bring-data i Monday
- [ ] Kontrollere at kunden mottar e-post