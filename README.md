# Equip · Viatges

Backoffice en català per a viatges d'esquí i ciclisme. Web estàtica; les dades i els documents romanen al navegador de l'usuari.

## Carpetes i documents

1. Crear un viatge i seleccionar una carpeta específica del viatge.
2. La carpeta utilitza File System Access quan està disponible, amb permís de lectura. La resta de navegadors guarden una còpia en IndexedDB (màxim 150 MB i 2.000 documents).
3. En vincular o actualitzar una carpeta es llegeixen els documents nous/modificats. Per a carpetes ja vinculades abans de l'actualització, prémer **Documents → Llegir documents**.
4. Els noms detectats creen automàticament el llistat de participants, sense duplicats, i s’hi obre la vista en acabar. En recarregar la web també es recuperen els participants de lectures anteriors. Els noms ambigus no s’assignen arbitràriament. Les fitxes i els trajectes detectats queden pendents de revisió.
5. La lectura és local: PDF.js per a PDF, SheetJS per a Excel, parser de CSV i Tesseract per a PNG/JPEG/WebP i pàgines PDF escanejades. Les biblioteques i el model OCR se serveixen des del mateix lloc; no s'envien documents a serveis externs.
6. **Revisar / associar** mostra el text extret, les persones proposades i els trajectes editables. Es poden seleccionar participants existents, crear-ne de nous, afegir o treure trajectes, associar un document a diverses persones, o ometre'l.
7. Després de confirmar, la fitxa del participant mostra els documents i trajectes associats, amb descàrrega del document original.

## Dades de compra

La lectura detecta la referència de compra (localitzador/PNR) i l’email de compra etiquetat al document o a les columnes d’Excel/CSV. Es guarden a `participant.purchases`, separades per document i reserva, i es mostren al llistat i al detall. La revisió permet corregir-los sense sobreescriure reserves d’altres documents. Les lectures antigues també es completen a partir del text ja guardat. Si hi ha diversos emails de compra possibles, el camp queda buit per revisar; els emails de suport no s’assignen com a comprador.

## Reconeixement i límits

El reconeixement utilitza etiquetes habituals de bitllets i reserves (català, castellà i anglès), noms complets existents, noms de passatger etiquetats i formats cognom/nom. No és una interpretació universal amb IA. Els camps no identificats queden buits perquè l'usuari els revisi. Noms iguals no es resolen arbitràriament. L'OCR utilitza el model anglès i pot confondre caràcters o accents.

Les files d'Excel conserven els trajectes de cada passatger. Les pàgines de PDF i les seccions de passatgers diferenciades es processen per separat. Les persones es creen en llegir; les associacions i els trajectes requereixen revisió; no modifiquen automàticament ni el check-in ni l'estat del bitllet, ni sobreescriuen camps manuals. La revisió és idempotent per document/persona. Un fitxer modificat marca l'associació anterior com a pendent de revisió; si desapareix de la carpeta, el document continua referenciat però s'indica que no està disponible.

Límits visibles: 30 MB per document, 100 documents per lot (botó per continuar), 40 pàgines PDF, màxim 10 pàgines OCR per PDF, 20 fulls i 2.000 files per full, text extret fins a 250.000 caràcters i previsualització guardada fins a 80.000. S'indica quan la lectura és parcial. PDF protegits, corruptes i formats no compatibles permeten associació manual. No hi ha lectura de DOCX o HEIC.

## Dades i còpies

IndexedDB conserva viatges, fitxes, permisos/còpies de fitxers i resultats de lectura. No hi ha comptes d'equip ni sincronització entre dispositius. Exportar periòdicament la còpia JSON. Inclou text extret i associacions, però no els fitxers originals; en restaurar s'afegeixen còpies noves, es remapen les persones i cal tornar a vincular la carpeta.

## Desenvolupament

`npm ci` instal·la versions fixades al lockfile. `npm run vendor` copia els recursos a dist/vendor. El model OCR eng 1.0.0 es conserva a dist/vendor/tessdata/eng.traineddata.gz. La distribució estàtica inclou les llicències i no necessita compilació.

`npm test` comprova extracció de PDF i Excel reals, CSV, noms amb accents/ordre invertit, homònims, separació de trajectes, associacions, idempotència i conservació de dades manuals. S'ha comprovat també el motor OCR real amb una imatge sintètica de bitllet.

Servir dist per HTTP local o HTTPS, no file://.

Referències: [PDF.js](https://mozilla.github.io/pdf.js/examples/), [Tesseract.js](https://github.com/naptha/tesseract.js/blob/master/docs/api.md), [SheetJS](https://docs.sheetjs.com/docs/getting-started/installation/standalone/).

### Lectura de confirmacions de companyies

El lector distingeix les taules de passatgers de Vueling, easyJet i Wizz Air de les signatures i dades de pagament. Conserva el destinatari de la confirmació original com a email de compra, el localitzador i els trajectes amb escales; elimina repeticions del mateix itinerari dins dels fils reenviats. També reconeix PDF sense extensió. Les coincidències de cognoms abreujats queden marcades per revisar i no s’inventa l’any quan falta al document.

Validació local amb una carpeta de set PDF: sis reserves i tretze participants, sense duplicats en repetir la importació. Els documents reals no formen part del repositori ni del desplegament.

Els trajectes detectats es guarden a cada participant i es mostren a la llista i a la fitxa. El resum del viatge inclou una graella amb comprovacions de trajectes, bitllet, check-in i recollida, amb filtres de pendents i accés directe a la gestió. L’aparcament es mostra com a informació, sense donar-lo per obligatori.

Les confirmacions de reserva identificades amb localitzador i vols associats marquen automàticament el bitllet com a «OK · Comprat». Es respecten els canvis manuals. La casella Check-in obre les reserves amb localitzador, email i l’enllaç oficial de la companyia (easyJet, Vueling o Wizz Air), i permet guardar l’estat manual del check-in. Obrir el web de la companyia no canvia aquest estat.

Rols i transports: cada participant té un rol i una forma de viatjar independents. Els vehicles tenen conductor vinculat a un participant o extern, places de passatger, punt i hora de recollida. Les assignacions d’anada i tornada són independents. La vista d’itinerari individual és una vista local de coordinació; no és un portal compartit ni activa login. L’email personal es recull separadament de l’email de compra per preparar l’accés individual posterior.

## Itineraris compartits i recollides

El projecte publica un Worker amb D1 (`DB`). El backend comprova la identitat de Sites i només l’email configurat a `ADMIN_EMAIL` pot publicar itineraris. Les consultes del portal `/me` es filtren al servidor per l’email personal del participant; l’email de compra mai concedeix accés. La política privada de Sites continua vigent: els esportistes s’han d’autoritzar com a visitants del lloc.

Des del resum, «Compartir itineraris» desa una projecció del viatge al servidor. Els canvis posteriors es sincronitzen; els conflictes de revisió no sobreescriuen dades. L’Excel original, els PDF, els permisos de carpeta i el text complet dels documents es queden al navegador. Les còpies locals de coordinació continuen disponibles i els itineraris compartits persisteixen a D1.

El portal permet consultar vols, reserves/check-in, vehicles, recollides, allotjament i notes personals, confirmar la lectura de la versió vigent i indicar el check-in. Coordinació consulta aquestes confirmacions des del resum. «Recollides» agrupa arribades per aeroport, dia i franja d’una hora, omet connexions consecutives conegudes i permet assignar un grup a un vehicle respectant capacitat i sentit.

Validació: `npm test` construeix el Worker i executa proves amb SQLite real per comprovar autorització, aïllament de participants, revocació per email, conflictes de revisió, confirmacions i recollides. `npm run db:generate` genera migracions Drizzle; `npm run build` prepara el Worker i els recursos del client.
