import {normalize} from './core.mjs';
export const participantRole=value=>['tecnic','tecnics','tecnico','staff','coach'].includes(normalize(value))?'Tècnic':['atleta','esportista','deportista'].includes(normalize(value))?'Esportista':value||'Esportista';
export const vehicleKey=direction=>direction==='Tornada'?'returnVehicle':'vehicle';
export function setTravelMode(person,mode){
 if(mode==='Cotxe'&&person.travelMode!=='Cotxe'){person.flightStatuses={ticket:person.ticket||'Pendent',checkin:person.checkin||'Pendent',ticketSource:person.ticketSource};person.ticket='No cal';person.checkin='No cal';}
 if(mode!=='Cotxe'&&person.travelMode==='Cotxe'){person.ticket=person.flightStatuses?.ticket||'Pendent';person.checkin=person.flightStatuses?.checkin||'Pendent';person.ticketSource=person.flightStatuses?.ticketSource;delete person.flightStatuses;}
 person.travelMode=mode;
}
export function saveVehicleAssignments(trip,vehicle,passengerIds){
 const draft=structuredClone(trip),driver=draft.people.find(p=>p.id===vehicle.driverId),key=vehicleKey(vehicle.direction),ids=[...new Set(passengerIds)];
 if(ids.some(id=>!draft.people.some(p=>p.id===id)))throw Error('Un passatger ja no és a la llista.');
 if(driver&&ids.includes(driver.id))throw Error('El conductor no s’ha de marcar també com a passatger.');
 if(vehicle.seats>0&&ids.length>vehicle.seats)throw Error(`El vehicle té ${vehicle.seats} places per a passatgers i n’has seleccionat ${ids.length}.`);
 const otherDriver=draft.vehicles.find(v=>v.id!==vehicle.id&&v.direction===vehicle.direction&&driver&&v.driverId===driver.id);
 if(otherDriver)throw Error('Aquesta persona ja condueix un altre vehicle en aquest trajecte.');
 if(ids.some(id=>draft.vehicles.some(v=>v.id!==vehicle.id&&v.direction===vehicle.direction&&v.driverId===id)))throw Error('Un passatger seleccionat condueix un altre vehicle en aquest trajecte.');
 const old=draft.vehicles.find(v=>v.id===vehicle.id);if(old){for(const p of draft.people)for(const k of ['vehicle','returnVehicle'])if(p[k]===vehicle.id)p[k]='';Object.assign(old,vehicle);}else draft.vehicles.push(vehicle);
 for(const p of draft.people){if(ids.includes(p.id))p[key]=vehicle.id;}
 if(driver){driver[key]='';setTravelMode(driver,'Cotxe');vehicle.driver=driver.name;vehicle.phone=vehicle.phone||driver.phone||'';Object.assign(draft.vehicles.find(v=>v.id===vehicle.id),vehicle);}
 return draft;
}
export function vehicleForPerson(trip,person,direction){const key=vehicleKey(direction);return trip.vehicles.find(v=>v.direction===direction&&(v.driverId===person.id||v.id===person[key]));}
export function validateAssignments(trip){
 for(const v of trip.vehicles){const key=vehicleKey(v.direction),passengers=trip.people.filter(p=>p[key]===v.id);if(v.driverId&&passengers.some(p=>p.id===v.driverId))throw Error('El conductor no pot ser també passatger del mateix vehicle.');if(v.seats>0&&passengers.length>v.seats)throw Error(`${v.name}: se superen les places disponibles.`);for(const p of passengers)if(trip.vehicles.some(other=>other.id!==v.id&&other.direction===v.direction&&other.driverId===p.id))throw Error(`${p.name} ja condueix un altre vehicle en aquest trajecte.`);}
}
