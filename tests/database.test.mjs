import test from 'node:test';
import assert from 'node:assert/strict';
import {createClient} from '@libsql/client';
import {initializeDatabase,sharedDatabase} from '../server/database.mjs';
import worker from '../dist/server/index.js';
test('Turso adapter persists shared trips and feedback with existing authorization',async()=>{
 const client=createClient({url:'file::memory:'});
 try{const DB=await initializeDatabase(client),env={DB,ADMIN_EMAIL:'admin@example.com'};
 const request=(path,email,method='GET',body)=>new Request('https://test.site'+path,{method,headers:{origin:'https://test.site','content-type':'application/json','oai-authenticated-user-id':'test','oai-authenticated-user-email':email},...(body?{body:JSON.stringify(body)}:{})});
 const trip={id:'trip',name:'Training',people:[{id:'one',name:'Anna',email:'anna@example.com'},{id:'two',name:'Pau',email:'pau@example.com'}]};
 assert.equal((await worker.fetch(request('/api/admin/trips/trip',env.ADMIN_EMAIL,'PUT',{trip,expectedRevision:0}),env)).status,200);
 const own=await (await worker.fetch(request('/api/my-trips','anna@example.com'),env)).json();assert.equal(own.trips.length,1);assert.equal(own.trips[0].person.id,'one');assert.equal(JSON.stringify(own).includes('pau@example.com'),false);
 assert.equal((await worker.fetch(request('/api/my-trips/trip/feedback','anna@example.com','POST',{action:'seen',revision:1}),env)).status,200);
 await initializeDatabase(client);
 const feedback=await DB.prepare('SELECT seen_revision FROM participant_feedback WHERE trip_id=? AND person_id=?').bind('trip','one').first();assert.equal(feedback.seen_revision,1);
 assert.equal((await worker.fetch(request('/api/admin/trips/trip',env.ADMIN_EMAIL,'PUT',{trip,expectedRevision:0}),env)).status,409);
 }finally{client.close();}
});
test('missing remote credentials do not create an ephemeral database',async()=>{assert.equal(await sharedDatabase({}),null);});
