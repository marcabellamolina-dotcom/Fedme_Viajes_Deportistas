import {recordsForPerson} from './document-model.mjs';
import {parseAirlineConfirmation} from './airline-parser.mjs';
// Official airline entry points, verified September 2026. No booking data in URLs.
export const checkinLinks={
 'easyJet':'https://www.easyjet.com/en/?chkin=1&nosplash=true',
 'Vueling':'https://tickets.vueling.com/WebCheckin1.aspx',
 'Wizz Air':'https://www.wizzair.com/'
};
export function checkinBookings(trip,personId){
 return recordsForPerson(trip,personId).flatMap(r=>{
  const provider=r.reading.provider||parseAirlineConfirmation(r.reading.text||'')?.provider||'';
  const source=r.pending?r.reading.proposals:r.reading.confirmed;
  return (source||[]).filter(c=>c.personId===personId&&!c.ambiguous).map(c=>({document:r.name,provider,url:checkinLinks[provider]||'',reference:c.purchase?.reference||r.reading.purchase?.reference||c.segments?.find(s=>s.reference)?.reference||'',email:c.purchase?.email||r.reading.purchase?.email||'',segments:c.segments||[],stale:r.stale}));
 });
}
export function checkinHTML(trip,person,esc){const bookings=checkinBookings(trip,person.id);return `<p>Fes servir les dades de cada reserva per accedir al check-in de la companyia.</p>${bookings.length?bookings.map(b=>`<section class="panel checkin-booking"><h3>${esc(b.provider||'Companyia per identificar')}</h3><p class="small muted">${esc(b.document)}</p>${b.stale?'<p class="notice">El document ha canviat. Revisa aquestes dades abans de fer el check-in.</p>':''}<dl class="detail-list"><div><dt>Localitzador / referència</dt><dd class="copyable">${esc(b.reference||'No detectat')}</dd></div><div><dt>Email de compra</dt><dd class="copyable">${esc(b.email||'No detectat')}</dd></div></dl>${b.segments.map(s=>`<p class="small">${esc(s.origin||'')} → ${esc(s.destination||'')} · ${esc(s.service||'')} · ${esc(s.departure||'')}</p>`).join('')}${b.url?`<a class="button" href="${esc(b.url)}" target="_blank" rel="noopener noreferrer">Fer check-in a ${esc(b.provider)} ↗</a>`:'<p class="notice">No s’ha identificat la companyia. Consulta el document per accedir al seu check-in.</p>'}</section>`).join(''):'<p class="notice">Encara no hi ha cap reserva associada. Llegeix els documents del viatge o associa’ls a aquest participant.</p>'}<p class="small muted">Obrir l’enllaç no marca el check-in com a fet. Marca’l quan hagis completat tots els vols d’aquest participant.</p>`}
