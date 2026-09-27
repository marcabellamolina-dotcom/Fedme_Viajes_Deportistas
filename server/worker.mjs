import {isPublicAthleteRequest,athleteEmailIdentity,upcomingTrip} from './athlete-access.mjs';
import adminHTML from '../dist/index.html';
import portalHTML from '../dist/portal.html';
import {validateSnapshot,personalView,personalEmail} from '../dist/shared-trip.mjs';
const json=(data,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
const html=body=>new Response(body,{headers:{'content-type':'text/html;charset=utf-8','cache-control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'}});
export function identity(request,env){const id=request.headers.get('oai-authenticated-user-id'),email=personalEmail(request.headers.get('oai-authenticated-user-email'));if(!id||!email)return null;return {id,email,admin:!!env.ADMIN_EMAIL&&email===personalEmail(env.ADMIN_EMAIL)};}
export async function handle(request,env){const url=new URL(request.url),path=url.pathname;let user=identity(request,env);
 if(isPublicAthleteRequest(path,request.method)){try{user=await athleteEmailIdentity(request)}catch(error){return json({error:error.message},400)}}
 if(path.startsWith('/api/')){
  if(!user)return json({error:'Inicia sessió per continuar.'},401);
  if(request.method!=='GET'&&(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site'))return json({error:'Origen no permès.'},403);
  if(path==='/api/me')return json({email:user.email,admin:user.admin});
  if(!env.DB)return json({error:'L’espai compartit no està disponible.'},503);
  if(path==='/api/admin/trips'&&request.method==='GET'){if(!user.admin)return json({error:'Només coordinació.'},403);const rows=await env.DB.prepare('SELECT id, revision, updated_at FROM shared_trips').all();return json({trips:rows.results});}
  const adminMatch=path.match(/^\/api\/admin\/trips\/([^/]+)$/);
  if(adminMatch){if(!user.admin)return json({error:'Només coordinació.'},403);const id=decodeURIComponent(adminMatch[1]);
   if(request.method==='GET'){const row=await env.DB.prepare('SELECT id, payload, revision, updated_at FROM shared_trips WHERE id = ?').bind(id).first();const feedback=await env.DB.prepare('SELECT person_id, seen_revision, checkin, updated_at FROM participant_feedback WHERE trip_id = ?').bind(id).all();return json({trip:row?{id:row.id,revision:row.revision,updated_at:row.updated_at,snapshot:JSON.parse(row.payload)}:null,feedback:feedback.results});}
   if(request.method==='PUT'){
    const raw=await request.text();if(raw.length>3000000)return json({error:'El viatge és massa gran.'},413);let body;try{body=JSON.parse(raw);validateSnapshot(body.trip);}catch(e){return json({error:e.message||'Dades no vàlides.'},400)}if(body.trip.id!==id||!Number.isInteger(body.expectedRevision)||body.expectedRevision<0)return json({error:'Revisió no vàlida.'},400);
    const now=new Date().toISOString(),payload=JSON.stringify(body.trip),expected=body.expectedRevision;let result;
    if(expected===0)result=await env.DB.prepare('INSERT INTO shared_trips (id,payload,revision,updated_at) VALUES (?,?,1,?) ON CONFLICT(id) DO NOTHING RETURNING revision').bind(id,payload,now).first();
    else result=await env.DB.prepare('UPDATE shared_trips SET payload = ?, revision = revision + 1, updated_at = ? WHERE id = ? AND revision = ? RETURNING revision').bind(payload,now,id,expected).first();
    if(!result)return json({error:'La versión compartida no coincide con la de este navegador. Revisa las dos versiones antes de publicar.'},409);return json({revision:result.revision,updatedAt:now});
   }
   return json({error:'Mètode no permès.'},405);
  }
  if(path==='/api/my-trips'&&['GET','POST'].includes(request.method)){
   let email=user.email;
   if(request.method==='POST'){let body;try{body=await request.json()}catch{return json({error:'Indica un email vàlid.'},400)}email=personalEmail(body.email);if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return json({error:'Indica un email vàlid.'},400);if(email!==user.email&&!user.admin)return json({error:'Aquest email no coincideix amb la sessió. Entra amb el compte d’aquest email per veure el teu viatge.'},403);}
   const preview=user.admin&&email!==user.email;
   const rows=await env.DB.prepare("SELECT id,payload,revision,updated_at FROM shared_trips WHERE EXISTS (SELECT 1 FROM json_each(shared_trips.payload,'$.people') p WHERE lower(json_extract(p.value,'$.email')) = ?)").bind(email).all();const trips=[];
   for(const row of rows.results){const snapshot=JSON.parse(row.payload);if(!upcomingTrip(snapshot))continue;for(const trip of personalView(snapshot,email)){const f=await env.DB.prepare('SELECT seen_revision,checkin FROM participant_feedback WHERE trip_id=? AND person_id=?').bind(row.id,trip.person.id).first();trips.push({...trip,revision:row.revision,updatedAt:row.updated_at,feedback:f||{}});}}trips.sort((a,b)=>String(a.start||'9999').localeCompare(String(b.start||'9999')));return json({trips,preview});
  }
  const feedbackMatch=path.match(/^\/api\/my-trips\/([^/]+)\/feedback$/);
  if(feedbackMatch&&request.method==='POST'){const id=decodeURIComponent(feedbackMatch[1]),row=await env.DB.prepare('SELECT payload,revision FROM shared_trips WHERE id=?').bind(id).first();if(!row)return json({error:'Viatge no disponible.'},404);const own=personalView(JSON.parse(row.payload),user.email);if(own.length!==1)return json({error:'No tens accés a aquest viatge.'},403);const body=await request.json();if(body.revision!==row.revision)return json({error:'El viatge ha canviat. Actualitza’l abans de confirmar.'},409);if(body.action!=='seen'&&body.action!=='checkin')return json({error:'Acció no vàlida.'},400);if(body.action==='checkin'&&!['Pendent','Fet'].includes(body.checkin))return json({error:'Estat no vàlid.'},400);const now=new Date().toISOString(),personId=own[0].person.id;
   if(body.action==='seen')await env.DB.prepare('INSERT INTO participant_feedback (trip_id,person_id,seen_revision,updated_at) VALUES (?,?,?,?) ON CONFLICT(trip_id,person_id) DO UPDATE SET seen_revision=excluded.seen_revision,updated_at=excluded.updated_at').bind(id,personId,row.revision,now).run();
   else await env.DB.prepare('INSERT INTO participant_feedback (trip_id,person_id,checkin,updated_at) VALUES (?,?,?,?) ON CONFLICT(trip_id,person_id) DO UPDATE SET checkin=excluded.checkin,updated_at=excluded.updated_at').bind(id,personId,body.checkin,now).run();return json({ok:true});
  }
  return json({error:'No trobat.'},404);
 }
 if(path==='/me'||path==='/me/')return html(portalHTML);
 if(path==='/'||path==='/index.html'){
  if(!user)return Response.redirect(url.origin+'/signin-with-chatgpt?return_to='+encodeURIComponent(path==='/me/'?'/me':path),302);
  return html(path.startsWith('/me')||!user.admin?portalHTML:adminHTML);
 }
 return env.ASSETS?env.ASSETS.fetch(request):new Response('Not found',{status:404});
}
export default {async fetch(request,env){try{return await handle(request,env)}catch(e){console.error('Travel request failed',e.message);return json({error:'No s’ha pogut completar l’operació. Torna-ho a provar; les dades locals es conserven.'},503)}}};
