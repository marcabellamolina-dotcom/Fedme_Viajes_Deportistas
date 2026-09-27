let promise;
export function authClient(){return promise??=initialize();}
async function script(src,attributes={}){await new Promise((resolve,reject)=>{const tag=document.createElement('script');tag.src=src;tag.crossOrigin='anonymous';Object.entries(attributes).forEach(([k,v])=>tag.setAttribute(k,v));tag.onload=resolve;tag.onerror=()=>reject(Error("No se ha podido cargar el acceso. Inténtalo de nuevo."));document.head.append(tag);});}
async function initialize(){
 const response=await fetch('/api/auth/config',{cache:'no-store'});
 // The existing Sites deployment and local preview retain their own identity.
 if(response.status===404)return null;
 if(!response.ok)throw Error("No se ha podido cargar el acceso.");
 const config=await response.json();
 if(!config.ready)throw Error("Estamos preparando el acceso por email. Inténtalo más tarde.");
 const encoded=config.publishableKey.replace(/^pk_(test|live)_/,'');
 const host=atob(encoded).replace(/\$$/,'');
 if(!/^[a-z0-9.-]+$/i.test(host))throw Error("Configuración de acceso no válida.");
 await script(`https://${host}/npm/@clerk/ui@1/dist/ui.browser.js`);
 await script(`https://${host}/npm/@clerk/clerk-js@6/dist/clerk.browser.js`,{'data-clerk-publishable-key':config.publishableKey});
 const {esES}=await import('./clerk-locale.mjs');
 await window.Clerk.load({localization:esES,ui:{ClerkUI:window.__internal_ClerkUICtor}});
 return window.Clerk;
}
export async function authFetch(path,options={}){
 const client=await authClient(),headers=new Headers(options.headers);
 if(client){const token=await client.session?.getToken();if(token)headers.set('Authorization','Bearer '+token);}
 return fetch(path,{...options,headers});
}
export async function requireSession(){
 try{const response=await authFetch('/api/me',{cache:'no-store'});
 if(response.status===401){location.replace('/sign-in');await new Promise(()=>{});}
 if(!response.ok)throw Error("No se ha podido verificar el acceso. Inténtalo de nuevo.");
 return response.json();
 }catch(error){const target=document.querySelector('#app')||document.querySelector('#portal');if(target){target.textContent=error.message;const a=document.createElement('a');a.href='/sign-in';a.textContent=" Volver al acceso";target.append(a);}throw error;}
}
export async function signOut(){const client=await authClient();if(client)await client.signOut({redirectUrl:'/sign-in'});else location.assign('/signout-with-chatgpt?return_to=%2Fme');}
