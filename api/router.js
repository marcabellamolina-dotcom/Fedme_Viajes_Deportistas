import {createClerkClient} from '@clerk/backend';
import worker from '../dist/server/index.js';
import {allowedOrigins,verifiedIdentity,trustedRequest} from '../server/vercel-auth.mjs';
export default async function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 const json=(status,body)=>res.status(status).json(body);
 try{
  const env={...process.env,CLERK_PUBLISHABLE_KEY:process.env.CLERK_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY};
  const incoming=new URL(req.url,'https://local.invalid');
  const route=incoming.searchParams.get('__route');
  const path=route?'/api/'+route:incoming.pathname;
  incoming.searchParams.delete('__route');
  const requestPath=path+(incoming.searchParams.size?'?'+incoming.searchParams.toString():'');
  if(path==='/api/auth/config')return json(200,{provider:'clerk',publishableKey:env.CLERK_PUBLISHABLE_KEY||'',ready:!!(env.CLERK_PUBLISHABLE_KEY&&env.CLERK_SECRET_KEY&&env.ADMIN_EMAIL)});
  if(!env.CLERK_PUBLISHABLE_KEY||!env.CLERK_SECRET_KEY||!env.ADMIN_EMAIL)return json(503,{error:'L’accés per email encara s’està configurant.'});
  const origins=allowedOrigins(env),host=req.headers.host;
  const origin=origins.find(o=>new URL(o).host===host);
  if(!origin)return json(403,{error:'Origen no permès.'});
  const headers=new Headers();for(const [key,value]of Object.entries(req.headers))if(value)headers.set(key,Array.isArray(value)?value.join(','):value);
  const options={method:req.method,headers};
  if(!['GET','HEAD'].includes(req.method))options.body=typeof req.body==='string'?req.body:JSON.stringify(req.body||{});
  const request=new Request(origin+requestPath,options);
  const client=createClerkClient({secretKey:env.CLERK_SECRET_KEY,publishableKey:env.CLERK_PUBLISHABLE_KEY});
  const user=await verifiedIdentity(request,client,env);
  if(!user)return json(401,{error:'Inicia sessió per continuar.'});
  if(path==='/api/me')return json(200,{email:user.email,admin:user.admin});
  const response=await worker.fetch(trustedRequest(request,user),{ADMIN_EMAIL:env.ADMIN_EMAIL});
  res.status(response.status);response.headers.forEach((value,key)=>res.setHeader(key,value));res.send(await response.text());
 }catch{json(503,{error:'No s’ha pogut verificar la sessió. Torna-ho a provar.'});}
}
