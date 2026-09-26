export function allowedOrigins(env){
 const values=[env.APP_URL,...[env.VERCEL_PROJECT_PRODUCTION_URL,env.VERCEL_URL].filter(Boolean).map(v=>'https://'+v)].filter(Boolean);
 return [...new Set(values.map(value=>new URL(value).origin))];
}
export async function verifiedIdentity(request,client,env){
 const origins=allowedOrigins(env);
 if(!origins.length)throw Error('APP_URL is required');
 const result=await client.authenticateRequest(request,{authorizedParties:origins,acceptsToken:'session_token'});
 if(!result.isSignedIn)return null;
 const auth=result.toAuth();if(!auth.userId)return null;
 const user=await client.users.getUser(auth.userId);
 const primary=user.emailAddresses.find(e=>e.id===user.primaryEmailAddressId&&e.verification?.status==='verified');
 if(!primary)return null;
 const email=primary.emailAddress.trim().toLowerCase();
 return {id:user.id,email,admin:!!env.ADMIN_EMAIL&&email===env.ADMIN_EMAIL.trim().toLowerCase()};
}
export function trustedRequest(request,user){
 const headers=new Headers(request.headers);
 for(const key of [...headers.keys()])if(key.startsWith('oai-'))headers.delete(key);
 headers.set('oai-authenticated-user-id',user.id);
 headers.set('oai-authenticated-user-email',user.email);
 return new Request(request,{headers});
}
