import {authClient,authFetch} from './auth.mjs';
const message=document.querySelector('#loginMessage');
try{const client=await authClient();if(!client)throw Error("El acceso por email todavía no está disponible.");
 if(new URL(location.href).searchParams.has('signout'))await client.signOut({redirectUrl:'/sign-in'});
 else if(client.user){const response=await authFetch('/api/me');if(!response.ok)throw Error("No se ha podido verificar la sesión. Inténtalo de nuevo.");const user=await response.json();location.replace(user.admin?'/admin':'/me');}
 else{client.mountSignIn(document.querySelector('#sign-in'),{routing:'hash',forceRedirectUrl:'/sign-in',signUpForceRedirectUrl:'/sign-in'});message.textContent='';}
}catch(error){message.textContent=error.message;}
