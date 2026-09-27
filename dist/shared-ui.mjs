import {authFetch} from './auth.mjs';
import {sharedSnapshot} from './shared-trip.mjs';
async function api(path,options){const response=await authFetch(path,{...options,headers:{'Content-Type':'application/json'},cache:'no-store'});const data=await response.json();if(!response.ok){const error=Error(data.error||"No se ha podido sincronizar.");error.status=response.status;throw error;}return data;}
const publishing=new Map();
export function shareTrip(trip,options={}){
 const previous=publishing.get(trip.id)||Promise.resolve();
 const task=previous.catch(()=>{}).then(()=>publish(trip,options));publishing.set(trip.id,task);
 task.finally(()=>{if(publishing.get(trip.id)===task)publishing.delete(trip.id);}).catch(()=>{});return task;
}
async function publish(trip,{expectedRevision,force=false}={}){
 const snapshot=sharedSnapshot(trip),digest=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(snapshot))))).map(x=>x.toString(16).padStart(2,'0')).join('');
 if(!force&&trip.shared?.digest===digest)return trip.shared;
 const send=revision=>api('/api/admin/trips/'+encodeURIComponent(trip.id),{method:'PUT',body:JSON.stringify({trip:snapshot,expectedRevision:revision})});
 let data;
 try{try{data=await send(expectedRevision??trip.shared?.revision??0);}catch(error){
  if(error.status!==409)throw error;
  const current=await sharedFeedback(trip);
  // A local revision can outlive a migration to a new, empty database.
  if(!current.trip)data=await send(0);
  else if(JSON.stringify(current.trip.snapshot)===JSON.stringify(snapshot))data={revision:current.trip.revision,updatedAt:current.trip.updated_at};
  else{trip.sharedConflict=true;throw error;}
 }}catch(error){trip.sharedError=error.message;throw error;}
 trip.shared={revision:data.revision,updatedAt:data.updatedAt,digest};delete trip.sharedError;delete trip.sharedConflict;return data;
}
export async function sharedFeedback(trip){return api('/api/admin/trips/'+encodeURIComponent(trip.id));}
export function sharedPanel(trip,esc){const missing=trip.people.filter(p=>!p.email).length;return `<section class="panel"><div class="section-head"><div><h3>Acceso de los deportistas</h3><p>${trip.shared?"Compartido · última sincronización "+esc(new Date(trip.shared.updatedAt).toLocaleString("es-ES")):"Todavía no se ha compartido este viaje."}</p></div><button class="button" data-action="share-trip">${trip.shared?"Actualizar viaje compartido":"Compartir itinerarios"}</button></div>${trip.sharedError?`<div class="notice">Cambios pendientes de compartir: ${esc(trip.sharedError)}</div>`:''}<p>${missing} participantes sin email personal. Cada persona solo podrá consultar sus datos.</p><div class="actions"><button class="button secondary" data-action="shared-feedback">Ver confirmaciones</button><a class="button secondary" href="/me" target="_blank" rel="noopener">Portal de los deportistas ↗</a></div><p class="small muted">Cada deportista accede con su email personal verificado. Añadir un email a la ficha no envía invitaciones. Los documentos originales permanecen en tu ordenador.</p></section>`;}
