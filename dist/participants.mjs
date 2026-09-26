const emailKey=value=>String(value||'').trim().toLowerCase();
const profile=p=>({name:p.name,email:emailKey(p.email),phone:p.phone||'',role:p.role||'Esportista',origin:p.origin||''});
export function collectParticipants(state){
 state.participants??=[];let changed=false;
 for(const trip of state.trips)for(const person of trip.people){
  if(person.participantId&&state.participants.some(p=>p.id===person.participantId))continue;
  const matches=person.email?state.participants.filter(p=>emailKey(p.email)===emailKey(person.email)):[];
  let entry=matches.length===1?matches[0]:null;
  if(!entry){entry={id:crypto.randomUUID(),...profile(person)};state.participants.push(entry);}
  person.participantId=entry.id;changed=true;
 }
 return changed;
}
export function assignParticipant(state,participantId,tripId){
 const person=state.participants?.find(p=>p.id===participantId),trip=state.trips.find(t=>t.id===tripId);
 if(!person||!trip)throw Error('Selecciona un participant i un viatge vàlids.');
 if(trip.people.some(p=>p.participantId===person.id||(person.email&&emailKey(p.email)===emailKey(person.email))))throw Error('Aquest participant ja està assignat al viatge.');
 const member={...profile(person),id:crypto.randomUUID(),participantId:person.id,travelMode:'Avió',ticket:'Pendent',checkin:'Pendent',vehicle:'',returnVehicle:'',notes:'',purchases:[],journeys:[]};
 trip.people.push(member);return trip;
}
