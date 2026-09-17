# Persoonlijke kennis in JustaBook

Gebouwd op `3acf668` in branch `codex/personal-knowledge`. Werkmap: `C:/Users/RJNie/OneDrive/Documenten/Website/justabook-knowledge/justabook`. Niet gecommit, gemerged of gedeployd. De oorspronkelijke werkmap bevat eigen wijzigingen aan package.json/package-lock.json; die zijn niet overgenomen of aangepast. Claude kan deze geïsoleerde diff reviewen en daarna integreren.

## Gedrag

De knop **Mijn kennis** opent een aparte werkruimte. De bestaande editor blijft gemount, zodat lopende boekbewerkingen hun toestand behouden.

- Bronnen: titel, https-link, transcript, import van txt/srt/vtt en private audio-opslag. Selecteer een fragment en maak er zelf een conceptles van, of vraag de bestaande Anthropic-provider om een concept. Het oorspronkelijke fragment en de bron blijven bij de les.
- Lessen: eigen tekst, korte herinnering, onderwerpen, bronlocatie, concept/goedkeuring. Een bestaande boekpagina kan als concept worden overgenomen. Het boek wordt niet gewijzigd. Lessen kunnen onderling worden verbonden met een eigen toelichting.
- Terughalen: letterlijke, op de server geverifieerde passages uit goedgekeurde lessen. Het model selecteert relevante fragmenten; alle vrije modeltekst wordt weggegooid. Onbekende IDs, verzonnen passages en conceptlessen worden geweigerd. Zonder match volgt expliciet een melding. Dit is bewust een assistent die passages terugvindt, nog geen vrije filosofische dialoog.
- Herinneringen: alleen eigen, opgeslagen herinneringsteksten bij goedgekeurde lessen. Dagelijks, om de twee/drie dagen, wekelijks of uit. De keuze wordt in Supabase bewaard; de kaart wisselt op basis van datum in Europe/Amsterdam. Deze eerste versie toont de kaart in de boekapp, geen achtergrondpush.
- Just My Plan: optionele knop om bij komende afspraken/taken passende lessen te zoeken. De server gebruikt uitsluitend GET `/api/data`, selecteert maximaal 50 titels met datum in de komende zeven dagen, en toont welke context is gebruikt. Geen wijzigingen in taken of agenda. De serverkoppeling is aan één expliciete boekgebruiker gekoppeld.

## Aansluiten vóór livegang

1. Reeds uitgevoerd: `sql/2026-09-14_knowledge.sql` in de Supabase-database die bij JustaBook hoort. De transactie maakt vier tabellen, eigenaargebonden RLS, referentiële integriteit en de private audiobucket. Bestaande boektabellen worden niet gewijzigd. De migratie is uitgevoerd via de ingelogde Supabase SQL-editor in project fsublwuxvujxibyacvvp. Supabase bevestigde succes. Controlequery bevestigt alle vier tabellen met RLS en elk één policy, plus de private jab-audio-bucket (200 MB) en de eigenaargebonden opslagpolicy. Voer deze migratie niet opnieuw uit.
2. De bestaande `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` moeten ook beschikbaar zijn voor de Vercel serverfunctie. Er wordt geen service-role-key gebruikt.
3. `ANTHROPIC_API_KEY` is nodig voor de kennisassistent en concepten. De implementatie volgt de bestaande app en gebruikt `claude-haiku-4-5-20251001`.
4. Voeg `SUPADATA_API_KEY` toe voor automatische transcriptie. YouTube via URL; Spotify via geplakt transcript of een eigen audiobestand. Een Spotify-link alleen kan niet worden getranscribeerd. Audio wordt rechtstreeks naar de private Supabase-bucket geüpload en met een tijdelijke URL aan Supadata doorgegeven. Maximaal 200 MB. Langdurige transcriptietaken worden opgeslagen en met **Transcript ophalen** hervat. Taak-ID’s zijn cryptografisch gebonden aan gebruiker en bron.
5. Optioneel: `JMP_API_KEY` van de betreffende gebruiker en `JMP_BOOK_USER_ID` met diens JustaBook auth-user-ID. Deze waarden staan alleen op de server. Zonder die configuratie geeft de agendaknop een duidelijke melding.
6. Deploy na review naar de bestaande Vercel-app, met `justabook` als projectroot. Een gewone Vite-preview bevat geen Vercel-serverfuncties; gebruik voor echte API-tests een Vercel-preview of `vercel dev`.

## Getest

- `npm test`: negen tests geslaagd. Auth verplicht, eigenaar/statusfilters, geen vrije modeltekst, geen concepten of vreemde IDs, expliciete lege kennisbank, vervalste transcriptietaak geweigerd, veilige links, transcript-tijdcodes, herinneringsrotatie en Amsterdam-datum, alleen lezen van agenda en geen privénotities naar de assistent.
- `npm run build`: geslaagd.
- ESLint op de nieuwe JS/JSX-modules en unit/API-tests: geslaagd. De bestaande app is niet breed opgeschoond.
- `tests/knowledge-ui.mjs`: browseracceptatietest met uitsluitend gesimuleerde Supabase/API-responses. Bron bewaren, fragment selecteren, AI-concept, zelf herschrijven, concept uitsluiten, goedkeuren, herinnering, geen-matchantwoord, herladen, mobiele breedte en ongewijzigde boektekst zijn gecontroleerd. Screenshots staan lokaal in `artifacts`.
- Live RLS met twee echte accounts, echte transcriptie, betaalde modelaanroepen, audio-upload en de echte JMP-koppeling moeten na configuratie nog als integratietest worden gecontroleerd. De mocktests bewijzen deze externe aansluitingen niet.

Voor de browseracceptatietest: zorg dat Playwright beschikbaar is (via node_modules of NODE_PATH), start Vite met `VITE_SUPABASE_URL=https://knowledge-test.supabase.co` en `VITE_SUPABASE_ANON_KEY=test-key`, en voer `node tests/knowledge-ui.mjs` uit. De standaard preview-URL is `http://127.0.0.1:4319`; `KNOWLEDGE_PREVIEW_URL` kan die overschrijven. `PLAYWRIGHT_CHANNEL` is standaard `msedge`.

## Nog niet gebouwd

- Automatisch een quote bovenaan Just My Plan-taken tonen, achtergrondmeldingen en een scheduler met afleverhistorie. Geen planning geactiveerd: gebruiker twijfelt nog tussen dagelijks en wekelijks.
- Rechtstreeks Spotify-afleveringen ophalen/transcriberen zonder transcript of audiobestand.
- Semantische index voor grote kennisbanken. De assistent verwerkt maximaal 500 goedgekeurde lessen / 220.000 tekens en meldt expliciet wanneer de bank te groot is, in plaats van stil een gedeelte over te slaan.
- Automatisch getekende kennisgraaf: verbindingen met toelichting bestaan, maar er is geen grafische graafweergave.

Let bij review op gelijktijdige bewerkingen: formulieren schrijven per rij, zonder versieconflictdetectie. Twee apparaten die dezelfde les tegelijk opslaan gebruiken de laatst opgeslagen versie. Gelijktijdig starten van transcriptie in twee tabbladen kan twee providerjobs veroorzaken; de UI voorkomt dubbelklikken binnen één tab, maar er is nog geen database-lock voor externe jobcreatie.

## Brondocumentatie transcriptie

- https://docs.supadata.ai/api-reference/endpoint/transcript/transcript
- https://docs.supadata.ai/api-reference/endpoint/transcript/transcript-get


## Actuele aansluiting

Supabase is ingericht via de browserlogin van Rinse; de oude lokale beheertoken blijft ongeldig en is niet aangepast. SUPADATA_API_KEY is na expliciete toestemming opgeslagen als Secret in het Vercel-project justabook, afzonderlijk voor Production en Preview. Vercel bevestigde succesvolle opslag. De waarde is niet in repositorybestanden opgenomen. De sleutel wordt pas actief bij een nieuwe deployment. De webuitbreiding is nog niet gedeployd. Databasepolicies zijn op aanwezigheid en configuratie gecontroleerd; een end-to-end test met twee echte app-accounts blijft nog open.

Vercel-configuratie gecontroleerd: ANTHROPIC_API_KEY, VITE_SUPABASE_URL en VITE_SUPABASE_ANON_KEY bestaan al voor Production en Preview. De nieuwe kennisbankcode moet nog worden gereviewd en gedeployd; er is bewust geen herdeploy van de oude app gestart. Een echte transcriptie via de nieuwe endpoint is nog niet getest.
