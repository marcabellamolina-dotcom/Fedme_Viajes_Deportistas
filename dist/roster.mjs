import {normalize} from './core.mjs';
import {nameKey} from './document-model.mjs';
export function rosterRows(tables){
 const result=new Map();
 for(const rows of tables){const at=rows.findIndex(row=>row.some(c=>['nom','nom i cognoms','nombre y apellidos','name','participant'].includes(normalize(c))));if(at<0)continue;
 const header=rows[at].map(normalize),col=aliases=>header.findIndex(h=>aliases.includes(h));
 const indexes={name:col(['nom','nom i cognoms','nombre y apellidos','name','participant']),role:col(['rol','role']),origin:col(['origen','origin']),phone:col(['telefon','telefono','phone']),notes:col(['observacions','notes'])};
 for(const row of rows.slice(at+1)){const values=Object.fromEntries(Object.entries(indexes).map(([k,i])=>[k,i<0?'':String(row[i]||'').trim()]));if(!values.name)continue;const key=nameKey(values.name);if(!key)continue;if(!result.has(key))result.set(key,values);}
 }
 if(!result.size)throw Error('No s’ha trobat cap participant. L’Excel ha de tenir una columna «Nom i cognoms».');
 return [...result.values()];
}
export function resetWithRoster(trip,rows,source){if(!rows.length)throw Error('La llista de participants és buida.');return {...structuredClone(trip),rosterMode:'excel',rosterSource:source,rosterLoadedAt:Date.now(),people:rows.map(p=>({...p,id:crypto.randomUUID(),ticket:'Pendent',checkin:'Pendent',arrival:'',pickup:'',parking:'',vehicle:'',purchases:[],journeys:[]})),readings:{},files:[],folder:null};}
export function cachedRoster(trip){const entries=Object.values(trip.readings||{}).filter(r=>/\.xlsx?$/i.test(r.name||'')&&r.text).sort((a,b)=>(b.readAt||0)-(a.readAt||0));for(const r of entries){try{return {rows:rosterRows([r.text.split('\n').map(l=>l.split('|').map(v=>v.trim()))]),source:r.name};}catch{}}return null;}
