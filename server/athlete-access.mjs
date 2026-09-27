// Email access applies only to the athlete portal, never to administrator routes.
export const isPublicAthleteRequest=(path,method)=>method==='POST'&&(path==='/api/my-trips'||/^\/api\/my-trips\/[^/]+\/feedback$/.test(path));
export async function athleteEmailIdentity(request){
 let body;try{body=await request.clone().json()}catch{throw Error('Introduce un email válido.');}
 const email=String(body.email||'').trim().toLowerCase();
 if(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Introduce un email válido.');
 return {id:'email-portal',email,admin:false};
}
export function upcomingTrip(trip,now=new Date()){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Madrid',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const end=String(trip.end||trip.start||'').slice(0,10);
 // Undated trips remain visible so participants can see dates pending confirmation.
 return !/^\d{4}-\d{2}-\d{2}$/.test(end)||end>=today;
}
