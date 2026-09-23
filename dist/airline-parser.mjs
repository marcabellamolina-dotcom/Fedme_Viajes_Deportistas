// Confirmation formats: passenger sections are distinct from email senders and payers.
const clean=s=>String(s||'').normalize('NFKC').replace(/\s+/g,' ').trim();
const fold=s=>clean(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const key=s=>fold(s).split(/[^a-z]+/).filter(Boolean).sort().join(' ');
const emailRE=/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9.-]*[A-Z0-9])?\.[A-Z]{2,}/gi;
const flightRE=/\b(?:[A-Z]{2,3}|[A-Z][0-9]|[0-9][A-Z])\s?\d{3,4}\b/g;
const notName=/\b(servicios|servicio|pasajeros|pasajero|vuelos|vuelo|asiento|asientos|equipaje|pieza|sin|bajo|maleta|mano|reserva|pago|pagos|total|facturado|facturada|directo|confirmado|confirmada|importante|detalles|detalle|politica|informacion|gestionar|compartimento|superior|transporte|condiciones|ida|vuelta|salida|llegada|contacto|alquilar|coche|reservar|alojamiento|actividades)\b/;
function personName(value){const s=clean(value).replace(/^(?:MR|MRS|MS|MISS|SR|SRA)\.?\s+/i,'');const parts=s.split(' ');return parts.length>=2&&parts.length<=8&&/^[\p{L} '’.-]+$/u.test(s)&&!notName.test(fold(s))&&parts.every(p=>/^[\p{Lu}]/u.test(p)||/^(de|del|la|las|los|da|do|dos|van|von|y|i)$/i.test(p))?s:''}
function meaningfulLines(text){return text.normalize('NFKC').split(/[\n\f]+/).map(clean).filter(l=>l&&!/^https?:\/\//.test(l)&&!/^\d{1,2}\/\d{1,2}\/\d{2,4}.*(?:Correo de|Confirmaci)/i.test(l)&&!/^\p{Co}+$/u.test(l));}
export function confirmationPurchase(text){
 const lines=meaningfulLines(text),refs=[],emails=[];
 const refRE=/(?:c[oó]digo de (?:reserva|con\s*fi\s*rmaci[oó]n(?: del vuelo)?)|referencia de (?:la )?reserva)\s*:\s*([A-Z0-9]{5,10})\b/gi;
 for(const m of text.normalize('NFKC').matchAll(refRE))refs.push(m[1].toUpperCase());
 for(let i=0;i<lines.length;i++){
  if(/^(?:De|From):/i.test(lines[i])&&/@(?:[a-z0-9.-]+\.)?(?:vueling|easyjet|wizzair)\.com\b/i.test(lines[i])){
   for(let j=i+1;j<Math.min(i+9,lines.length);j++){
    if(/^(?:De|From):/i.test(lines[j]))break;
    if(/^(?:To|Para):/i.test(lines[j])){emails.push(...(lines[j].match(emailRE)||[]));break;}
   }
  }
  if(/hemos enviado un (?:e-?mail|correo).*\ba\b/i.test(lines[i]))emails.push(...(lines[i].match(emailRE)||[]));
 }
 const referenceCandidates=[...new Set(refs)],emailCandidates=[...new Set(emails.map(e=>e.toLowerCase()))];
 return {reference:referenceCandidates.length===1?referenceCandidates[0]:'',email:emailCandidates.length===1?emailCandidates[0]:'',referenceCandidates,emailCandidates};
}
function uniqueSegments(segments,warnings){const found=new Map();for(const s of segments){const k=[s.origin,s.destination,s.service,s.departure.replace(/\s+\d\d:\d\d$/,'')].join('|');const prev=found.get(k);if(!prev)found.set(k,s);else if(JSON.stringify(prev)!==JSON.stringify(s))warnings.push('El fil conté versions diferents d’un vol. S’ha proposat la primera aparició; comprova els horaris.');}return [...found.values()]}
function vuelingSegments(lines,warnings){
 const out=[];
 for(let i=0;i<lines.length;i++){
  const m=lines[i].match(/^(?:(Ida|Vuelta)\s+)?(?:Lunes|Martes|Mi[eé]rcoles|Jueves|Viernes|S[aá]bado|Domingo),?\s+(\d{1,2}\s+(?:de\s+)?[\p{L}]+\s+\d{4})$/iu);
  if(!m)continue;
  const block=[];for(let j=i+1;j<Math.min(i+12,lines.length);j++){if(/^(?:Ida|Vuelta|PASAJEROS)/i.test(lines[j]))break;block.push(lines[j])}
  const airportLine=block.find(l=>/^[A-Z]{3}(?:\s+[A-Z]{3}){1,3}$/.test(l));
  const times=block.filter(l=>/^(?:\d{1,2}:\d{2}h?\s*){2,6}$/.test(l)).flatMap(l=>l.match(/\d{1,2}:\d{2}/g)||[]);
  const services=block.filter(l=>/^(?:(?:[A-Z]{2,3}|[A-Z]\d|\d[A-Z])\s?\d{3,4}\s*)+$/.test(l)).flatMap(l=>l.match(flightRE)||[]);
  if(!airportLine)continue;const airports=airportLine.split(' ');
  for(let n=0;n<airports.length-1;n++)if(times[n*2]&&times[n*2+1])out.push({origin:airports[n],destination:airports[n+1],departure:`${m[2]} ${times[n*2]}`,arrival:`${m[2]} ${times[n*2+1]}`,service:services[n]?.replace(/\s/g,'')||'',direction:m[1]||''});
 }
 if(out.length)return uniqueSegments(out,warnings);
 // Printable confirmation page: the route headings and vertical time/airport cards are separate.
 const detailIndex=lines.findIndex(l=>/^DETALLES DE TU VIAJE$/i.test(l));
 if(detailIndex<0)return [];
 const firstPassenger=lines.findIndex((l,i)=>i>detailIndex&&personName(l)&&lines.slice(i+1,i+4).some(x=>/^(?:1 pieza|Sin asiento)/i.test(x)));
 const block=lines.slice(detailIndex,firstPassenger<0?detailIndex+90:firstPassenger);
 const dates=block.map(l=>l.match(/\b(?:lun|mar|mi[eé]|jue|vie|s[aá]b|dom)\.?\s+(\d{1,2}\s+[\p{L}]+(?:\s+\d{4})?)$/iu)?.[1]).filter(Boolean);
 const airports=block.filter(l=>/^[A-Z]{3}$/.test(l));
 const times=block.filter(l=>/^\d{1,2}:\d{2}$/.test(l));
 const services=block.filter(l=>/^[A-Z]{2}\d{3,4}$/.test(l));
 for(let n=0;n<Math.min(dates.length,services.length);n++)if(airports[n*2+1]&&times[n*2+1])out.push({origin:airports[n*2],destination:airports[n*2+1],departure:`${dates[n]} ${times[n*2]}`,arrival:`${dates[n]} ${times[n*2+1]}`,service:services[n]});
 if(out.length&&dates.some(d=>! /\d{4}/.test(d)))warnings.push('La confirmació no indica l’any al costat dels vols. Comprova i completa l’any.');
 return uniqueSegments(out,warnings);
}
function easyjetSegments(lines){
 const routes=lines.map(l=>l.replace(/\s+Gestionar reservas.*$/i,'')).map(l=>l.match(/^([\p{Lu}][\p{L}0-9 ()-]{1,55}) a ([\p{Lu}][\p{L}0-9 ()-]{1,55})$/u)).filter(Boolean);
 const services=lines.filter(l=>/^(?:EJU|EZY|U2|EC|DS)\d{3,4}$/.test(l));
 const dates={departure:[],arrival:[]};
 for(let i=0;i<lines.length;i++){
  const m=lines[i].match(/^(Salida|Llegada):\s*(.*)$/i);if(!m)continue;
  const values=[m[2],...lines.slice(i+1,i+4)].filter(Boolean),date=values.find(v=>/\d{1,2}\s+[\p{L}]+\.?\s+\d{4}/u.test(v)),time=values.find(v=>/^\d{1,2}:\d{2}$/.test(v));
  if(date&&time)dates[m[1].toLowerCase()==='salida'?'departure':'arrival'].push(`${date} ${time}`);
 }
 return routes.map((m,i)=>({origin:m[1],destination:m[2],departure:dates.departure[i]||'',arrival:dates.arrival[i]||'',service:services[i]||''})).filter(s=>s.departure||s.arrival);
}
function wizzSegments(lines){
 const start=lines.findIndex(l=>/^Datos del vuelo$/i.test(l));if(start<0)return [];
 const block=lines.slice(start,start+12),joined=block.join('\n');
 const flight=joined.match(/(?:N[.º°o\s]*de vuelo:\s*)([A-Z]\d\s*\d{3,4})/i)?.[1]?.replace(/\s/g,'');
 const codes=[...joined.matchAll(/\(([A-Z]{3})\)/g)].map(m=>m[1]);
 const dates=[...joined.matchAll(/\d{1,2}\/\d{1,2}\/\d{4}\s+\d{1,2}:\d{2}/g)].map(m=>m[0]);
 return codes.length>=2?[{origin:codes[0],destination:codes[1],departure:dates[0]||'',arrival:dates[1]||'',service:flight||''}]:[];
}
export function parseAirlineConfirmation(text){
 const lines=meaningfulLines(text);let provider='';
 if(/(?:vueling\.com|\bVueling\b)/i.test(text)&&/PASAJEROS\s+Y\s+SERVICIOS/i.test(text))provider='Vueling';
 else if(/easyjet/i.test(text)&&/referencia de la reserva/i.test(text))provider='easyJet';
 else if(/wizzair\.com|Wizz Air/i.test(text)&&/Informaci[oó]n del pasajero/i.test(text))provider='Wizz Air';
 if(!provider)return null;
 const passengers=[],warnings=[],purchase=confirmationPurchase(text);
 if(provider==='Vueling'){
  for(let i=0;i<lines.length;i++){
   const name=personName(lines[i]);if(!name)continue;
   if(lines.slice(i+1,i+4).some(l=>/^(?:Asiento\b|Sin asiento\b|1 pieza\b)/i.test(l)))passengers.push({name,evidence:lines[i]});
  }
 }else if(provider==='easyJet'){
  for(const line of lines){const m=line.match(/^(?:Sr|Sra|Mr|Mrs|Ms)\.?\s+(.+)$/i);if(m){const name=personName(m[1]);if(name)passengers.push({name,evidence:line});}}
 }else{
  for(const line of lines){const m=line.match(/^(?:MR|MRS|MS|MISS)\s+(.+?)\s+[A-Z]{3}\s*-\s*[A-Z]{3}\b/);if(m){const name=personName(m[1]);if(name)passengers.push({name,evidence:line});}}
 }
 const segments=provider==='Vueling'?vuelingSegments(lines,warnings):provider==='easyJet'?easyjetSegments(lines):wizzSegments(lines);
 if(!segments.length)warnings.push('S’han trobat passatgers però no s’ha pogut reconstruir el trajecte. Revisa’l al document.');
 if(purchase.referenceCandidates.length>1)warnings.push('El document conté diverses reserves; cal revisar la referència de cada persona.');
 if(purchase.emailCandidates.length>1)warnings.push('Hi ha diversos destinataris de confirmació. Revisa l’email de compra.');
 return {provider,passengers:[...new Map(passengers.map(p=>[key(p.name),p])).values()],segments:segments.map(s=>({...s,reference:purchase.reference})),purchase,warnings};
}
