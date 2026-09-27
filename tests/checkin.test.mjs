import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeText,syncDetectedParticipants,syncJourneys} from '../dist/document-model.mjs';
import {checkinBookings,checkinHTML} from '../dist/checkin.mjs';
import {participantProgress} from '../dist/trip-dashboard.mjs';
const text=`easyJet
De: easyJet <bookings@easyjet.com>
To: buyer@example.org
referencia de la reserva: ABC1234
Sra. Anna Soler Puig
Málaga a Milán Malpensa (T2)
EJU3744
Salida:
11 oct. 2026
10:10
Llegada:
11 oct. 2026
12:45`;
function fixture(){const t={people:[],vehicles:[],files:[{path:'a.pdf'}],readings:{'a.pdf':{...analyzeText({text,people:[]}),status:'ready',fingerprint:'a'}}};syncDetectedParticipants(t);return t;}
test('airline purchase confirmation automatically marks ticket purchased, never check-in',()=>{const t=fixture(),p=t.people[0];assert.equal(p.ticket,'Comprat');assert.equal(p.checkin,'Pendent');assert.equal(participantProgress(t,p).checks.find(c=>c.key==='ticket').detail,'OK · Comprado');assert.equal(participantProgress(t,p).checks.find(c=>c.key==='checkin').action,'person-checkin');assert.equal(syncDetectedParticipants(t).updated,0);});
test('manual ticket correction survives reading and missing evidence clears only automatic status',()=>{const t=fixture(),p=t.people[0];p.ticket='Pendent';p.ticketSource='manual';syncDetectedParticipants(t);assert.equal(p.ticket,'Pendent');delete p.ticketSource;syncDetectedParticipants(t);assert.equal(p.ticket,'Comprat');t.readings['a.pdf'].status='ignored';syncJourneys(t);assert.equal(p.ticket,'Pendent');});
test('check-in displays original purchase data with official airline link',()=>{const t=fixture(),b=checkinBookings(t,t.people[0].id)[0];assert.equal(b.reference,'ABC1234');assert.equal(b.email,'buyer@example.org');assert.match(b.url,/^https:\/\/www.easyjet.com\//);const html=checkinHTML(t,t.people[0],String);assert.match(html,/ABC1234/);assert.match(html,/buyer@example.org/);assert.match(html,/target="_blank" rel="noopener noreferrer"/);});
test('different bookings and carriers stay separate',()=>{const t=fixture(),id=t.people[0].id;t.readings.b={provider:'Vueling',status:'ready',fingerprint:'b',proposals:[{personId:id,name:t.people[0].name,purchase:{reference:'XYZ456',email:'other@example.org'},segments:[{origin:'MXP',destination:'BCN',service:'VY1234'}]}]};syncDetectedParticipants(t);const b=checkinBookings(t,id);assert.equal(b.length,2);assert.equal(b[1].reference,'XYZ456');assert.equal(b[1].email,'other@example.org');assert.match(b[1].url,/tickets.vueling.com/);});
