import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeText,applyReview,proposeAssociations,recordsForPerson,fingerprint,needsReading,syncDetectedParticipants,removeParticipant} from '../dist/document-model.mjs';
import {extractDocument,pdfText} from '../dist/document-reader.mjs';
import * as XLSX from '../dist/vendor/xlsx.mjs';
const people=[{id:'anna',name:'Anna Soler',origin:'Girona',ticket:'No cal',checkin:'Pendent'},{id:'marc',name:'Marc Abella'}];
const ticket='Passenger: SOLER/ANNA\nFrom: BCN\nTo: MXP\nDeparture: 25/09/2026 10:15\nArrival: 25/09/2026 12:00\nFlight: VY6332\nBooking reference: ABC123';
test('PDF names can be reversed, with origin, destination, times and locator',()=>{const r=analyzeText({text:ticket,people});assert.equal(r.proposals[0].personId,'anna');assert.equal(r.proposals[0].segments[0].origin,'BCN');assert.equal(r.proposals[0].segments[0].arrival,'25/09/2026 12:00');assert.equal(r.proposals[0].segments[0].reference,'ABC123')});
test('new labelled passenger is proposed without inventing a person',()=>{const r=proposeAssociations('Passatger: Júlia Puig\nOrigen: Girona\nDestinació: Milà',people);assert.equal(r[0].name,'Júlia Puig');assert.equal(r[0].personId,'')});
test('Spanish labels and names on next line',()=>{const r=proposeAssociations('Nombre y apellidos:\nAnna Soler\nDesde: Barcelona\nHasta: Roma',people);assert.equal(r[0].personId,'anna');assert.equal(r[0].segments[0].destination,'Roma')});
test('unknown unlabelled words and filenames do not create people',()=>{const r=analyzeText({text:'Booking confirmation\nTotal 100 EUR',people,name:'Anna-Soler.pdf'});assert.equal(r.proposals.length,0)});
test('a first name alone is not enough to match a participant',()=>{assert.equal(proposeAssociations('Anna\nFlight: VY1234',people).length,0)});
test('duplicate names are ambiguous, not arbitrarily assigned',()=>{const r=proposeAssociations(ticket,[...people,{id:'anna2',name:'Anna Soler'}]);assert.equal(r[0].ambiguous,true);assert.equal(r[0].personId,'')});
test('separate PDF pages do not mix two people’s routes',()=>{const r=proposeAssociations(ticket+'\fPassenger: Marc Abella\nFrom: GRO\nTo: BGY',people);assert.equal(r.find(p=>p.personId==='anna').segments.length,1);assert.equal(r.find(p=>p.personId==='marc').segments[0].origin,'GRO')});
test('spreadsheet rows retain different routes for each person',()=>{const tables=[[['Nom','Origen','Destinació','Sortida'],['Anna Soler','BCN','MXP','10:15'],['Marc Abella','GRO','BGY','09:00']]];const r=proposeAssociations('',people,tables);assert.equal(r[0].segments[0].origin,'BCN');assert.equal(r[1].segments[0].origin,'GRO')});
test('multiple rows for one passenger keep both legs',()=>{const r=proposeAssociations('',people,[[['Nom','Origen','Destinació'],['Anna Soler','BCN','MXP'],['Anna Soler','MXP','BCN']]]);assert.equal(r.length,1);assert.equal(r[0].segments.length,2)});
function fixture(){return {id:'trip',people:structuredClone(people),files:[{path:'ticket.pdf',size:12,modified:1}],readings:{'ticket.pdf':{name:'ticket.pdf',fingerprint:'v1',proposals:[]}}}}
test('confirming a document is idempotent and preserves manual status fields',()=>{const t=fixture(),choices=[{enabled:true,personId:'anna',segments:[{origin:'BCN',destination:'MXP'}]}];const first=applyReview(t,'ticket.pdf',choices),second=applyReview(first,'ticket.pdf',choices);assert.equal(second.people.length,2);assert.equal(second.people[0].origin,'Girona');assert.equal(second.people[0].ticket,'No cal');assert.equal(second.readings['ticket.pdf'].confirmed.length,1);assert.equal(recordsForPerson(second,'anna')[0].segments.length,1);assert.equal(t.readings['ticket.pdf'].confirmed,undefined)});
test('all selections validate before any person is created',()=>{const t=fixture();assert.throws(()=>applyReview(t,'ticket.pdf',[{enabled:true,name:'Júlia Puig',segments:[]},{enabled:true,name:'',segments:[]}]));assert.equal(t.people.length,2)});
test('new names deduplicate across documents',()=>{let t=fixture();t=applyReview(t,'ticket.pdf',[{enabled:true,name:'Júlia Puig',segments:[]}]);t.readings['other.pdf']={fingerprint:'v1'};t=applyReview(t,'other.pdf',[{enabled:true,name:'PUIG/JULIA',segments:[]}]);assert.equal(t.people.length,3)});
test('changed documents and removed files are flagged without losing confirmed journeys',()=>{let t=applyReview(fixture(),'ticket.pdf',[{enabled:true,personId:'anna',segments:[{origin:'BCN'}]}]);t.readings['ticket.pdf'].fingerprint='v2';t.files=[];const r=recordsForPerson(t,'anna')[0];assert.equal(r.stale,true);assert.equal(r.missing,true);assert.equal(r.segments[0].origin,'BCN')});
test('file revision invalidates the reading',()=>assert.notEqual(fingerprint({path:'a',size:1,modified:1}),fingerprint({path:'a',size:2,modified:1})));
test('real Excel workbook is read into per-person proposals',async()=>{const ws=XLSX.utils.aoa_to_sheet([['Nom','Origen','Destinació'],['Anna Soler','BCN','MXP']]);const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Viatge');const f=new File([XLSX.write(wb,{type:'array',bookType:'xlsx'})],'viatge.xlsx');const parsed=await extractDocument(f);const result=analyzeText({...parsed,people});assert.equal(result.proposals[0].personId,'anna');assert.equal(result.proposals[0].segments[0].destination,'MXP')});
test('CSV with BOM and quoted fields is read',async()=>{const f=new File(['\uFEFFNom;Origen;Destinació\r\n"Anna Soler";BCN;MXP'],'viatge.csv');const result=analyzeText({...await extractDocument(f),people});assert.equal(result.proposals[0].personId,'anna')});
test('PDF layout keeps lines',()=>assert.equal(pdfText([{str:'Passenger:',transform:[0,0,0,0,0,100]},{str:'Anna Soler',hasEOL:true,transform:[0,0,0,0,50,100]},{str:'BCN',transform:[0,0,0,0,0,80]}]),'Passenger: Anna Soler\nBCN'));
function makePDF(lines){const stream='BT /F1 12 Tf 50 780 Td '+lines.map((line,i)=>(i?'0 -20 Td ':'')+'('+line.replace(/[()\\]/g,'\\$&')+') Tj').join('\n')+' ET';const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 850] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];let doc='%PDF-1.4\n',offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(doc.length);doc+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`}const start=doc.length;doc+=`xref\n0 6\n0000000000 65535 f \n`+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('')+`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;return new File([doc],'ticket.pdf')}
test('a real PDF is decoded, not just matched by filename',async()=>{const parsed=await extractDocument(makePDF(ticket.split('\n')),{ocr:false});const r=analyzeText({...parsed,people});assert.equal(r.proposals[0].personId,'anna');assert.equal(r.proposals[0].segments[0].service,'VY6332')});
test('unsupported files are explicit errors',async()=>assert.rejects(()=>extractDocument(new File(['x'],'archive.zip')),/Format no compatible/));
test('separate passenger sections on the same page retain their own routes',()=>{const r=proposeAssociations(ticket+'\nPassenger: Marc Abella\nFrom: GRO\nTo: BGY',people);assert.equal(r.find(p=>p.personId==='anna').segments[0].origin,'BCN');assert.equal(r.find(p=>p.personId==='anna').segments.length,1);assert.equal(r.find(p=>p.personId==='marc').segments[0].origin,'GRO')});
test('standalone airline surname/name proposes a new passenger',()=>{const r=proposeAssociations('PUIG/JULIA\nFrom: BCN\nTo: FCO',[]);assert.equal(r[0].name,'PUIG/JULIA')});

test("opening a manual review does not prevent later content reading",()=>{const file={path:"a.pdf",size:20,modified:1};assert.equal(needsReading(file,{fingerprint:fingerprint(file),status:"unread"}),true);assert.equal(needsReading(file,{fingerprint:fingerprint(file),status:"ready"}),false)});

test('reading creates participants immediately and repeat reads do not duplicate them',()=>{
  const t={people:[],files:[{path:'ticket.pdf'}],readings:{'ticket.pdf':{...analyzeText({text:ticket,people:[]}),status:'ready',fingerprint:'a'}}};
  assert.equal(syncDetectedParticipants(t).added,1);
  assert.equal(t.people.length,1);
  assert.equal(t.people[0].ticket,'Pendent');
  assert.equal(t.people[0].checkin,'Pendent');
  assert.equal(syncDetectedParticipants(t).added,0);
  assert.equal(recordsForPerson(t,t.people[0].id)[0].pending,true);
  assert.equal(recordsForPerson(t,t.people[0].id)[0].segments[0].origin,'BCN');
});
test('old cached proposals populate the list without reopening the folder',()=>{
  const t={people:[],readings:{'a.pdf':{status:'ready',fingerprint:'old',proposals:[{name:'Anna Soler',segments:[]}]},'b.pdf':{status:'ready',fingerprint:'old',proposals:[{name:'SOLER/ANNA',segments:[]}]}}};
  const result=syncDetectedParticipants(t);
  assert.equal(result.added,1);assert.equal(t.people.length,1);
  assert.equal(t.readings['a.pdf'].proposals[0].personId,t.readings['b.pdf'].proposals[0].personId);
});
test('ignored or confirmed documents do not recreate rejected participants',()=>{
  const t={people:[],readings:{a:{status:'ignored',proposals:[{name:'Anna Soler'}]},b:{status:'reviewed',fingerprint:'x',reviewedFingerprint:'x',proposals:[{name:'Marc Abella'}]}}};
  assert.equal(syncDetectedParticipants(t).added,0);
});
test('duplicate existing names stay ambiguous and never create a third participant',()=>{
  const t={people:[{id:'a',name:'Anna Soler'},{id:'b',name:'Anna Soler'}],readings:{a:{status:'ready',fingerprint:'x',proposals:[{name:'Anna Soler'}]}}};
  assert.equal(syncDetectedParticipants(t).unresolved,1);assert.equal(t.people.length,2);assert.equal(t.readings.a.proposals[0].ambiguous,true);
});
test('deleting an automatically detected participant persists across reload and rereading',()=>{
  const t={people:[],readings:{a:{status:'ready',fingerprint:'x',proposals:[{name:'Anna Soler',segments:[]}]}}};
  syncDetectedParticipants(t);removeParticipant(t,t.people[0].id);
  assert.equal(syncDetectedParticipants(t).added,0);
  t.readings.a.proposals=[{name:'Anna Soler',segments:[]}];
  assert.equal(syncDetectedParticipants(t).added,0);
});
test('plural headings and numbered passenger lists are recognized',()=>{
  for(const heading of ['Passengers:','Passenger(s):','Pasajeros:','Passatgers:']){
    const r=proposeAssociations(heading+'\n1. Anna Soler\n2. Marc Abella\nFrom: BCN\nTo: MXP',[]);
    assert.deepEqual(r.map(p=>p.name),['Anna Soler','Marc Abella']);
  }
});
test('document reading workflow saves participants and opens their list',async()=>{
  const {createDocumentFeatures}=await import('../dist/document-ui.mjs');
  const file=new File(['Nom;Origen;Destinació\nAnna Soler;BCN;MXP\nMarc Abella;GRO;BGY'],'people.csv');
  const t={id:'trip',people:[],files:[{name:file.name,path:file.name,size:file.size,modified:1}]};
  let saves=0,view='';
  const oldDocument=globalThis.document;globalThis.document={querySelector:()=>null};
  try{
    const feature=createDocumentFeatures({esc:String,getTrip:()=>t,getState:()=>({trips:[t]}),toast:()=>{},read:async()=>({files:[{path:file.name,file}]}),persist:async()=>{saves++},render:()=>{},goToDocuments:()=>{view='documents'},goToParticipants:()=>{view='participants'}});
    await feature.analyze();
    assert.equal(t.people.length,2);assert.equal(view,'participants');assert.ok(saves>0);
    await feature.analyze();assert.equal(t.people.length,2);
  }finally{globalThis.document=oldDocument}
});
test('cached text with a previously unrecognized heading creates the participant',()=>{
  const t={people:[],readings:{a:{status:'ready',fingerprint:'x',proposals:[],text:'Passengers:\n1. Anna Soler\nFrom: BCN\nTo: MXP'}}};
  assert.equal(syncDetectedParticipants(t).added,1);assert.equal(t.people[0].name,'Anna Soler');
});
