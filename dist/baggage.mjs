const fold=s=>String(s||'').normalize('NFKC').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\s+/g,' ').trim();
const nameKey=s=>fold(s).replace(/^(mr|mrs|ms|sr|sra)\.? /,'').split(/[^a-z]+/).filter(Boolean).sort().join(' ');
const tidy=s=>String(s||'').replace(/[\uE000-\uF8FF]/g,'').replace(/\s+/g,' ').trim();
const items=block=>{
 const joined=tidy(block),out=[];
 for(const m of joined.matchAll(/\b(\d+)\s+maletas?\s+de\s+(\d+(?:[.,]\d+)?)\s*kg\s*\(en\s+bodega\)/gi))out.push(`${m[1]} maleta${m[1]==='1'?'':'s'} de ${m[2]} kg en bodega`);
 for(const m of joined.matchAll(/\b(\d+)\s+equipos?\s+de\s+esqu[ií]/gi))out.push(`${m[1]} equipo${m[1]==='1'?'':'s'} de esquí`);
 return [...new Set(out)].join(' · ');
};
// Only booking line items count. Airline policies, upsells and cabin luggage do not.
export function baggageForFlight(text,name,segment,segments=[],passengerNames=[]){
 const lines=String(text||'').normalize('NFKC').split(/[\n\f]+/).map(tidy).filter(Boolean);
 const key=nameKey(name),route=fold(`${segment.origin}-${segment.destination}`).replace(/ /g,'');
 if(/wizzair\.com|wizz air/i.test(text)){
  const row=lines.find(l=>{const m=l.match(/^(?:MR|MRS|MS|MISS)\s+(.+?)\s+([A-Z]{3}\s*-\s*[A-Z]{3})\s+(.+)$/);return m&&nameKey(m[1])===key&&fold(m[2]).replace(/ /g,'')===route;});
  const checked=row?.match(/\b(\d+)\s*\/\s*(\d+)\s*kg\b/i);
  return checked?`${checked[1]} maleta${checked[1]==='1'?'':'s'} de ${checked[2]} kg en bodega. Material deportivo: pendiente de confirmar.`:'';
 }
 if(/easyjet/i.test(text)){
  const bag=lines.find(l=>/^\d+\s*x\s*\d+\s*kg de equipaje facturado$/i.test(l));
  const sport=lines.find(l=>/^\d+\s*x\s*(?:Esquís o botas|equipo deportivo)$/i.test(l));
  if(!bag&&!sport)return '';
  return `Total de la reserva conjunta: ${[bag,sport].filter(Boolean).join(' · ')}. Reparto por persona y trayecto: pendiente de confirmar.`;
 }
 if(/vueling/i.test(text)){
  const start=lines.findIndex(l=>/^EQUIPAJE$/i.test(l));if(start<0)return '';
  const end=lines.findIndex((l,i)=>i>start&&/^ASIENTOS$/i.test(l));
  const section=lines.slice(start+1,end<0?undefined:end);
  const names=new Set(passengerNames.map(nameKey));names.add(key);const lineName=l=>names.has(nameKey(l))?nameKey(l):nameKey(l.replace(/^[A-Z]{2,3}\s+/,''));
  const begin=section.findIndex(l=>lineName(l)===key);if(begin<0)return '';
  let finish=section.findIndex((l,i)=>i>begin&&names.has(lineName(l)));if(finish<0)finish=section.length;
  const block=section.slice(begin+1,finish);
  const direction=fold(segment.direction)==='vuelta'||segment.direction==='Tornada'?'vuelta':fold(segment.direction)==='ida'||segment.direction==='Anada'?'ida':segments.length===2?(segments.indexOf(segment)===0?'ida':'vuelta'):segments.length===1?'ida':'';
  if(!direction)return '';
  const pos=block.findIndex(l=>fold(l)===direction);if(pos<0)return '';
  const next=block.findIndex((l,i)=>i>pos&&/^(ida|vuelta)$/i.test(l));
  return items(block.slice(pos+1,next<0?undefined:next).join(' '));
 }
 return '';
}
export function flightBaggageHTML(segment,esc){return `<aside class="flight-baggage"><strong>Equipaje facturado y material deportivo</strong><p>${esc(segment.baggage||'No consta en la reserva · pendiente de confirmar')}</p>${segment.pending||segment.stale?'<small>Lectura pendiente de revisión por coordinación</small>':''}</aside>`;}
