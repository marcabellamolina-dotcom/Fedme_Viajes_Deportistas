import {normalize,parseCSV} from './core.mjs';
export const readerVersion=1;
export const fingerprint=f=>`${readerVersion}:${f.path}:${f.size}:${f.modified}`;
export const needsReading=(file,reading)=>!reading||reading.fingerprint!==fingerprint(file)||['error','unread'].includes(reading.status);
const clean=s=>String(s??'').replace(/\s+/g,' ').trim();
const words=s=>normalize(s).replace(/[^a-z0-9]+/g,' ').trim();
const nameWords=s=>words(s).split(' ').filter(w=>w&&!['mr','mrs','ms','miss','sr','sra','dr','adult','adulto','adultos','adults'].includes(w));
export const nameKey=s=>nameWords(s).sort().join(' ');
const STOP=/\b(passenger|passatger|pasajero|departure|arrival|flight|booking|reference|document|ticket|reserva|aeroport|airport|airlines|boarding|confirmacio|telefono|telefon|equipatge|luggage|origen|destinacio|destination|conductor|hora|sortida|tornada|anada|adult|adults|seat|seient|check|nom|name|nombre)\b/i;
function validName(s){const n=clean(s).replace(/^(?:MR|MRS|MS|MISS|SR|SRA|DR)\.?\s+/i,'').replace(/\s+(?:MR|MRS|MS|MISS|SR|SRA|DR)\.?$/i,'');return n.length<=90&&nameWords(n).length>=2&&nameWords(n).length<=7&&/^[\p{L} .,'’/\-]+$/u.test(n)&&!STOP.test(words(n))?n:''}
function candidatesFromText(text){
  const lines=text.split(/\r?\n/).map(clean).filter(Boolean),found=[];
  const label=/^(?:(?:passengers?(?:\(s\))?|travellers?|travelers?|guests?|pasajeros?|pasajeras?|passatgers?|passatgeres?)(?:\s+(?:names?|nombres?|noms?))?|nom(?: i cognoms| du passager)?|nombre(?: y apellidos| del pasajero)?|name(?: of passenger)?)(?=\s|[:：\-]|$)\s*[:：\-]?\s*(.*)$/i;
  const add=(value,evidence)=>{
    let count=0;
    for(const part of value.split(/\s*[;|]\s*/)){
      const n=validName(part.replace(/^\d+[.)]?\s*/,''));
      if(n){found.push({name:n,evidence});count++;}
    }
    return count;
  };
  for(let i=0;i<lines.length;i++){
    const line=lines[i],match=line.match(label);
    if(match){
      if(match[1])add(match[1],line);
      else for(let j=i+1;j<Math.min(lines.length,i+31);j++){
        if(label.test(lines[j])||!add(lines[j],line+' '+lines[j]))break;
      }
    }
    const airlineName=line.match(/^([A-ZÀ-Ÿ][A-ZÀ-Ÿ .'-]{1,50}\/[A-ZÀ-Ÿ][A-ZÀ-Ÿ .'-]{1,40})(?:\s+(?:MR|MRS|MS|MISS))?$/);
    if(airlineName)add(airlineName[1],line);
    const honorific=line.match(/^(?:MR|MRS|MS|MISS|SR|SRA)\.?\s+(.+)$/i);
    if(honorific)add(honorific[1],line);
  }
  return [...new Map(found.map(c=>[nameKey(c.name),c])).values()];
}

const LABELS={origin:['origen','origin','from','desde','salida de','departure airport','sortida de'],destination:['destinacio','destination','to','hasta','destino','arrival airport','arribada a'],departure:['sortida','departure','salida','data sortida','departure date','fecha salida'],arrival:['arribada','arrival','llegada','data arribada','arrival date'],service:['vol','flight','vuelo','tren','train','flight number'],reference:['localitzador','localizador','pnr','booking reference','reservation number','referencia','reservation code','booking code']};
function labeled(line){const n=normalize(line);for(const [key,labels] of Object.entries(LABELS))for(const label of labels.sort((a,b)=>b.length-a.length)){const prefix=new RegExp('^'+label+'(?:\\s*[:：]\\s*|\\s+)(.+)$','i'),m=n.match(prefix);if(m){const offset=line.length-m[1].length;return [key,clean(line.slice(offset))]}}return null}
export function extractSegments(text){const lines=text.split(/\r?\n/).map(clean).filter(Boolean);const parts=[];let current={};let reference='';const flush=()=>{if(Object.values(current).some(Boolean))parts.push(current);current={}};for(let i=0;i<lines.length;i++){const line=lines[i];if(/^(outbound|inbound|anada|tornada|ida|vuelta|return flight|flight \d+)\s*:?(?:\s|$)/i.test(line)&&Object.keys(current).length)flush();let pair=labeled(line);if(!pair){for(const [key,labels]of Object.entries(LABELS)){if(labels.includes(normalize(line.replace(/[:：]$/,'')))&&lines[i+1]&&!labeled(lines[i+1])){pair=[key,lines[i+1]];i++;break}}}if(pair){const [key,value]=pair;if(value.length>180)continue;if(key==='reference'){reference=value;continue}if(current[key]&&current[key]!==value)flush();current[key]=value;continue}const route=line.match(/\b([A-Z]{3})\s*(?:→|->|–|—|\bto\b|\ba\b|-)\s*([A-Z]{3})\b/);if(route){if(current.origin&&current.destination)flush();current.origin=route[1];current.destination=route[2];continue}const flight=line.match(/\b([A-Z]{2}\s?\d{2,4})\b/);if(flight&&!current.service)current.service=flight[1]}flush();if(reference&&!parts.length)parts.push({reference});return parts.slice(0,30).map(p=>({...p,reference:p.reference||reference}));}
const TABLE_HEADERS={name:['nom','nom i cognoms','nom complet','nombre','nombre y apellidos','name','passenger','passenger name','pasajero','passatger','traveller'],origin:['origen','origin','from','desde'],destination:['destinacio','destino','destination','to','hasta'],departure:['sortida','departure','salida','data sortida','fecha salida','hora sortida'],arrival:['arribada','arrival','llegada','hora arribada'],service:['vol','vuelo','flight','tren','train','vehicle','cotxe'],reference:['localitzador','localizador','pnr','referencia','booking reference']};
export function tableCandidates(rows){if(!rows?.length)return [];const headerIndex=rows.findIndex(row=>row.some(c=>TABLE_HEADERS.name.includes(normalize(c))));if(headerIndex<0)return [];const headers=rows[headerIndex].map(normalize),columns=Object.fromEntries(Object.entries(TABLE_HEADERS).map(([key,aliases])=>[key,headers.findIndex(h=>aliases.includes(h))]));return rows.slice(headerIndex+1).filter(r=>clean(r[columns.name])).map(r=>{const name=clean(r[columns.name]);const segment=Object.fromEntries(Object.entries(columns).filter(([k,i])=>k!=='name'&&i>=0&&clean(r[i])).map(([k,i])=>[k,clean(r[i])]));return {name,evidence:r.map(clean).join(' | '),segments:Object.keys(segment).length?[segment]:[]}})}
function proposeOne(text,people=[],tables=[]){const segments=extractSegments(text);let candidates=tables.flatMap(tableCandidates);if(!candidates.length)candidates=candidatesFromText(text).map(c=>({...c,segments}));const normalizedLines=text.split(/\r?\n/).map(line=>({line,key:words(line),tokens:nameWords(line)}));for(const p of people){const tokens=nameWords(p.name);if(tokens.length<2)continue;const line=normalizedLines.find(l=>tokens.every(token=>l.tokens.includes(token)));if(line&&!candidates.some(c=>nameKey(c.name)===nameKey(p.name)))candidates.push({name:p.name,evidence:line.line,segments})}const grouped=new Map();for(const candidate of candidates){const key=nameKey(candidate.name);if(!key)continue;const existing=grouped.get(key);if(existing){for(const s of candidate.segments){if(!existing.segments.some(x=>JSON.stringify(x)===JSON.stringify(s)))existing.segments.push(s)}continue}const matches=people.filter(p=>nameKey(p.name)===key);grouped.set(key,{name:candidate.name,personId:matches.length===1?matches[0].id:'',ambiguous:matches.length>1,evidence:candidate.evidence.slice(0,350),segments:structuredClone(candidate.segments)})}return [...grouped.values()].slice(0,200)}
export function proposeAssociations(text,people=[],tables=[]){
  const sections=tables.length?[text]:text.split('\f').flatMap(page=>{
    const found=candidatesFromText(page),lines=page.split(/\r?\n/);
    const starts=found.map(c=>lines.findIndex(line=>clean(line)===c.evidence)).filter(i=>i>=0).sort((a,b)=>a-b);
    if(starts.length<2)return [page];
    const blocks=starts.map((start,i)=>lines.slice(start,starts[i+1]??lines.length).join('\n'));
    return blocks.every(block=>extractSegments(block).some(s=>s.origin||s.destination||s.departure))?blocks:[page];
  });
  const merged=new Map();
  for(const section of sections){for(const p of proposeOne(section,people,tables)){
    const key=nameKey(p.name),prior=merged.get(key);
    if(!prior)merged.set(key,p);
    else for(const seg of p.segments)if(!prior.segments.some(s=>JSON.stringify(s)===JSON.stringify(seg)))prior.segments.push(seg);
  }}
  return [...merged.values()];
}
export function analyzeText({text,people,tables=[],name=''}){const proposals=proposeAssociations(text,people,tables);const warnings=[];if(!text.trim())warnings.push('No s’ha pogut extreure text. Assigna el document manualment.');else if(!proposals.length)warnings.push('No s’ha identificat cap passatger amb prou informació. Selecciona’l manualment.');if(proposals.some(p=>p.ambiguous))warnings.push('Hi ha participants amb el mateix nom. Tria la persona correcta.');return {proposals,warnings,text:text.slice(0,80000),name}}
export function recordsForPerson(trip,personId){return Object.entries(trip.readings||{}).flatMap(([path,r])=>{
  const confirmed=(r.confirmed||[]).filter(c=>c.personId===personId);
  const proposed=r.status!=='ignored'&&r.reviewedFingerprint!==r.fingerprint?(r.proposals||[]).filter(c=>c.personId===personId):[];
  if(!confirmed.length&&!proposed.length)return [];
  const pending=!confirmed.length;
  return [{path,name:r.name||path,reading:r,pending,stale:!pending&&r.reviewedFingerprint!==r.fingerprint,missing:!trip.files.some(f=>f.path===path),segments:(pending?proposed:confirmed).flatMap(c=>c.segments||[])}];
})}

export function applyReview(trip,path,choices){const reading=trip.readings?.[path];if(!reading)throw Error('Torna a llegir el document abans de confirmar.');const draft=structuredClone(trip),r=draft.readings[path],confirmed=[];for(const choice of choices){if(!choice.enabled)continue;let person;if(choice.personId){person=draft.people.find(p=>p.id===choice.personId);if(!person)throw Error('Un participant seleccionat ja no existeix.')}else{const name=clean(choice.name);if(!name)throw Error('Indica el nom de cada participant nou.');const matches=draft.people.filter(p=>nameKey(p.name)===nameKey(name));if(matches.length>1)throw Error(`Hi ha més d’una persona amb el nom ${name}. Selecciona-la a la llista.`);person=matches[0];if(!person){person={id:crypto.randomUUID(),name,origin:'',phone:'',arrival:'',ticket:'Pendent',checkin:'Pendent',pickup:'',parking:'',vehicle:'',notes:''};draft.people.push(person)}}const segments=(choice.segments||[]).map(s=>Object.fromEntries(Object.entries(s).map(([k,v])=>[k,clean(v)]))).filter(s=>Object.values(s).some(Boolean));const prior=confirmed.find(c=>c.personId===person.id);if(prior){for(const s of segments)if(!prior.segments.some(x=>JSON.stringify(x)===JSON.stringify(s)))prior.segments.push(s)}else confirmed.push({personId:person.id,segments});}if(!confirmed.length)throw Error('Selecciona almenys una persona per associar el document.');r.confirmed=confirmed;r.reviewedAt=Date.now();r.reviewedFingerprint=r.fingerprint;r.status='reviewed';return draft}

// Materialize detected names immediately; itinerary associations still require review.
export function syncDetectedParticipants(trip){
  let added=0,linked=0,unresolved=0;
  for(const [path,r] of Object.entries(trip.readings||{})){
    if(!['ready','unread'].includes(r.status)||r.reviewedFingerprint===r.fingerprint)continue;
    if(!r.proposals?.length&&r.text){r.proposals=proposeAssociations(r.text,trip.people);if(r.proposals.length)r.warnings=(r.warnings||[]).filter(w=>!w.startsWith('No s’ha identificat cap passatger'));}
    for(const proposal of r.proposals||[]){
      const name=validName(proposal.name),key=nameKey(name);
      if(!name||(r.dismissedNames||[]).includes(key)){unresolved++;continue;}
      let person=trip.people.find(p=>p.id===proposal.personId);
      if(!person){
        const matches=trip.people.filter(p=>nameKey(p.name)===key);
        if(matches.length>1){proposal.ambiguous=true;proposal.personId='';unresolved++;continue;}
        person=matches[0];
        if(!person){
          person={id:crypto.randomUUID(),name,origin:'',phone:'',arrival:'',ticket:'Pendent',checkin:'Pendent',pickup:'',parking:'',vehicle:'',notes:'',createdFromDocument:true};
          trip.people.push(person);added++;
        }
      }
      if(proposal.personId!==person.id)linked++;
      proposal.personId=person.id;proposal.ambiguous=false;
    }
  }
  return {added,linked,unresolved};
}

export function removeParticipant(trip,id){
  const person=trip.people.find(p=>p.id===id);
  if(!person)return;
  const key=nameKey(person.name);
  trip.people=trip.people.filter(p=>p.id!==id);
  for(const r of Object.values(trip.readings||{})){
    const removed=(r.proposals||[]).filter(p=>p.personId===id||nameKey(p.name)===key);
    r.dismissedNames=[...new Set([...(r.dismissedNames||[]),...removed.map(p=>nameKey(p.name))])];
    r.proposals=(r.proposals||[]).filter(p=>!removed.includes(p));
    r.confirmed=(r.confirmed||[]).filter(c=>c.personId!==id);
    if(r.status==='reviewed'&&!r.confirmed.length){r.status='ready';r.reviewedFingerprint=null;}
  }
}
