import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeText,syncDetectedParticipants} from '../dist/document-model.mjs';
import {documentFormat} from '../dist/document-reader.mjs';
const vueling=`De: Coordinador <forward@example.org>
Para: other@example.org
De: Vueling <info@vueling.com>
Para: buyer@example.org
Código de reserva: ABC789
Ida Lunes, 12 octubre 2026
BCN MXP
11:30 13:15
VY6342
Vuelta Martes, 27 octubre 2026
MXP BCN BIO
17:20 19:00 21:35 22:50
VY6047 VY1480
PASAJEROS Y SERVICIOS
Anna Soler Puig
Asiento 12A
ALQUILAR COCHE
1 pieza`;
test('Vueling passenger tables, original purchase recipient and connecting legs',()=>{const r=analyzeText({text:vueling,people:[]});assert.deepEqual(r.proposals.map(p=>p.name),['Anna Soler Puig']);assert.equal(r.purchase.email,'buyer@example.org');assert.equal(r.purchase.reference,'ABC789');assert.equal(r.proposals[0].segments.length,3);assert.equal(r.proposals[0].segments[2].destination,'BIO');assert.equal(r.proposals[0].segments[2].departure,'27 octubre 2026 21:35');});
test('forwarded duplicate itinerary does not duplicate passengers or flights',()=>{const r=analyzeText({text:vueling+'\n'+vueling,people:[]});assert.equal(r.proposals.length,1);assert.equal(r.proposals[0].segments.length,3);});
test('easyJet separates passenger and flight departure from baggage drop',()=>{const r=analyzeText({people:[],text:`easyJet
De: easyJet <donotreply@easyjet.com>
To: buyer@example.org
referencia de la reserva: TST7890
Sr. Pau Serra Roig
Málaga a Milán Malpensa (T2)
EJU3744
Entrega de equipaje
08:10
Salida:
dom. 11 oct. 2026
10:10
Llegada:
dom. 11 oct. 2026
12:45`});assert.equal(r.proposals[0].name,'Pau Serra Roig');assert.match(r.proposals[0].segments[0].departure,/10:10$/);assert.equal(r.purchase.reference,'TST7890');});
test('Wizz passenger table and flight spanning a page break',()=>{const r=analyzeText({people:[],text:`Wizz Air
Código de confirmación: XYZ789
Información del pasajero
MR PAU SERRA ROIG BIO-MXP 1
Datos del vuelo
N.º de vuelo: W4 6412
Bilbao (BIO)
Milan (MXP)
11/10/2026 10:00\f11/10/2026 11:55`});assert.equal(r.proposals.length,1);assert.equal(r.proposals[0].segments[0].service,'W46412');assert.equal(r.proposals[0].segments[0].arrival,'11/10/2026 11:55');});
test('extensionless PDF is detected by its bytes',async()=>assert.equal(await documentFormat(new File(['%PDF-1.7\n'],'return ticket')),'pdf'));
test('unique longer surname variant links pending records without creating a duplicate',()=>{const t={people:[{id:'p',name:'Anna Soler Puig Ferrer'}],readings:{a:{status:'ready',fingerprint:'a',...analyzeText({text:vueling,people:[]})}}};syncDetectedParticipants(t);assert.equal(t.people.length,1);assert.equal(t.readings.a.proposals[0].personId,'p');assert.equal(t.readings.a.proposals[0].nameVariant,true);});
test('old cached airline extraction is corrected and untouched bogus headers removed',()=>{const t={people:[{id:'bad',name:'Y SERVICIOS',createdFromDocument:true}],readings:{a:{status:'ready',fingerprint:'a',parserVersion:2,text:vueling,proposals:[{name:'Y SERVICIOS',personId:'bad'}]}}};syncDetectedParticipants(t);assert.deepEqual(t.people.map(p=>p.name),['Anna Soler Puig']);assert.equal(t.people[0].purchases[0].reference,'ABC789');});
