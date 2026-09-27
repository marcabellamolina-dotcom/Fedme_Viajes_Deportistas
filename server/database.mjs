import {createClient} from '@libsql/client/web';
export function databaseAdapter(client){
 return {prepare(sql){const statement=args=>({bind(...values){return statement(values)},async first(){const r=await client.execute({sql,args});return r.rows[0]||null},async all(){const r=await client.execute({sql,args});return {results:r.rows}},async run(){const r=await client.execute({sql,args});return {success:true,meta:{changes:r.rowsAffected}}}});return statement([]);}};
}
export async function initializeDatabase(client){await client.batch([
 'CREATE TABLE IF NOT EXISTS shared_trips (id TEXT PRIMARY KEY NOT NULL, payload TEXT NOT NULL, revision INTEGER NOT NULL, updated_at TEXT NOT NULL)',
 'CREATE TABLE IF NOT EXISTS participant_feedback (trip_id TEXT NOT NULL, person_id TEXT NOT NULL, seen_revision INTEGER, checkin TEXT, updated_at TEXT NOT NULL, PRIMARY KEY (trip_id,person_id))'
],'write');return databaseAdapter(client);}
let connection;
export async function sharedDatabase(env){
 if(!env.TURSO_DATABASE_URL||!env.TURSO_AUTH_TOKEN)return null;
 if(!connection){connection=initializeDatabase(createClient({url:env.TURSO_DATABASE_URL,authToken:env.TURSO_AUTH_TOKEN})).catch(error=>{connection=null;throw error});}
 return connection;
}
