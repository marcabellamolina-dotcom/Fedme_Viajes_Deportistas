# Equip · Viatges

Backoffice en català per a viatges d'esquí i ciclisme. Web estàtica; les dades i els documents romanen al navegador de l'usuari.

## Carpetes i documents

1. Crear un viatge i seleccionar una carpeta específica del viatge.
2. La carpeta utilitza File System Access quan està disponible, amb permís de lectura. La resta de navegadors guarden una còpia en IndexedDB (màxim 150 MB i 2.000 documents).
3. En vincular o actualitzar una carpeta es llegeixen els documents nous/modificats. Per a carpetes ja vinculades abans de l'actualització, prémer **Documents → Llegir documents**.
4. La lectura és local: PDF.js per a PDF, SheetJS per a Excel, parser de CSV i Tesseract per a PNG/JPEG/WebP i pàgines PDF escanejades. Les biblioteques i el model OCR se serveixen des del mateix lloc; no s'envien documents a serveis externs.
5. **Revisar / associar** mostra el text extret, les persones proposades i els trajectes editables. Es poden seleccionar participants existents, crear-ne de nous, afegir o treure trajectes, associar un document a diverses persones, o ometre'l.
6. Després de confirmar, la fitxa del participant mostra els documents i trajectes associats, amb descàrrega del document original.

## Reconeixement i límits

El reconeixement utilitza etiquetes habituals de bitllets i reserves (català, castellà i anglès), noms complets existents, noms de passatger etiquetats i formats cognom/nom. No és una interpretació universal amb IA. Els camps no identificats queden buits perquè l'usuari els revisi. Noms iguals no es resolen arbitràriament. L'OCR utilitza el model anglès i pot confondre caràcters o accents.

Les files d'Excel conserven els trajectes de cada passatger. Les pàgines de PDF i les seccions de passatgers diferenciades es processen per separat. Les propostes requereixen revisió; no modifiquen automàticament ni el check-in ni l'estat del bitllet, ni sobreescriuen camps manuals. La revisió és idempotent per document/persona. Un fitxer modificat marca l'associació anterior com a pendent de revisió; si desapareix de la carpeta, el document continua referenciat però s'indica que no està disponible.

Límits visibles: 30 MB per document, 100 documents per lot (botó per continuar), 40 pàgines PDF, màxim 10 pàgines OCR per PDF, 20 fulls i 2.000 files per full, text extret fins a 250.000 caràcters i previsualització guardada fins a 80.000. S'indica quan la lectura és parcial. PDF protegits, corruptes i formats no compatibles permeten associació manual. No hi ha lectura de DOCX o HEIC.

## Dades i còpies

IndexedDB conserva viatges, fitxes, permisos/còpies de fitxers i resultats de lectura. No hi ha comptes d'equip ni sincronització entre dispositius. Exportar periòdicament la còpia JSON. Inclou text extret i associacions, però no els fitxers originals; en restaurar s'afegeixen còpies noves, es remapen les persones i cal tornar a vincular la carpeta.

## Desenvolupament

`npm ci` instal·la versions fixades al lockfile. `npm run vendor` copia els recursos a dist/vendor. El model OCR eng 1.0.0 es conserva a dist/vendor/tessdata/eng.traineddata.gz. La distribució estàtica inclou les llicències i no necessita compilació.

`npm test` comprova extracció de PDF i Excel reals, CSV, noms amb accents/ordre invertit, homònims, separació de trajectes, associacions, idempotència i conservació de dades manuals. S'ha comprovat també el motor OCR real amb una imatge sintètica de bitllet.

Servir dist per HTTP local o HTTPS, no file://.

Referències: [PDF.js](https://mozilla.github.io/pdf.js/examples/), [Tesseract.js](https://github.com/naptha/tesseract.js/blob/master/docs/api.md), [SheetJS](https://docs.sheetjs.com/docs/getting-started/installation/standalone/).
