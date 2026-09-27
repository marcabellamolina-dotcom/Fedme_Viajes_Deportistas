import test from 'node:test';import assert from 'node:assert/strict';
import {tripLogo,spanishLabel} from '../dist/branding.mjs';
import {sharedSnapshot,personalView} from '../dist/shared-trip.mjs';
test('ski branding is included in shared athlete itinerary while cycling remains unbranded',()=>{const trip={id:'one',name:'Training',sport:'Esquí',people:[{id:'p',name:'Anna',email:'anna@example.com'}],vehicles:[],files:[]};const shared=sharedSnapshot(trip),personal=personalView(shared,'anna@example.com')[0];assert.equal(personal.sport,'Esquí');assert.match(tripLogo(personal),/fedme-logo_rojo.webp/);assert.equal(tripLogo({...personal,sport:'Ciclisme'}),'');assert.equal(tripLogo({}), '');});
test('Spanish labels preserve the persisted values',()=>{const original={travelMode:'Cotxe',direction:'Tornada'};assert.equal(spanishLabel(original.travelMode),'Coche');assert.equal(spanishLabel(original.direction),'Vuelta');assert.equal(original.travelMode,'Cotxe');});
