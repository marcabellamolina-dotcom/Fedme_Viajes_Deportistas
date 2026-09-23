# Equip · Viatges V0

Backoffice en català per a viatges d'esquí i ciclisme. Web estàtica sense dependències de compilació.

## Ús

1. Crear un viatge i seleccionar una carpeta específica del viatge.
2. En navegadors que implementen File System Access, es conserva el handle en IndexedDB i només es llegeixen els documents en prémer Actualitzar o Descarregar. Cal renovar el permís quan el navegador ho demana.
3. En altres navegadors, el selector de carpeta guarda una còpia en IndexedDB (màxim 150 MB i 2.000 documents). Actualitzar demana tornar a seleccionar la carpeta.
4. Crear participants i transports o importar CSV UTF-8 exportats des d'Excel. Hi ha plantilles descarregables, previsualització i detecció de noms duplicats. Les files existents es conserven.
5. Exportar periòdicament una còpia JSON de les fitxes. Els documents i permisos no s'inclouen; cal tornar a vincular les carpetes en restaurar. La restauració afegeix còpies i no elimina viatges existents.

## Abast

Les dades són locals al navegador i a l'origen de la pàgina. No hi ha usuaris d'equip, sincronització entre dispositius, lectura automàtica de PDF, check-in automàtic ni càrrega de documents al servidor. La publicació de Sites és privada per al propietari. La previsualització local i l'URL publicada tenen emmagatzematges separats.

Un participant té una assignació de vehicle i un camp lliure de recollida. Els vehicles distingeixen anada i tornada. Les anotacions de passatgers importades no creen assignacions. El recompte de places considera únicament participants assignats, no conductor ni anotacions lliures.

## Comprovació

`node --check dist/app.js`

El mòdul `dist/core.mjs` conté el parser de CSV, la normalització i els avisos pendents. Comprovats: separadors, camps entre cometes, salts de línia, accents en capçaleres, zeros inicials de telèfon, estats desconeguts, places negatives i sobreocupació.

Servir `dist` per HTTP local o HTTPS; no obrir amb file://. No cal un procés de compilació.
