"use client";
import {useState} from "react";
type Provider="github"|"email"|"calendar"|"files";
type HealthResponse={healthy?:boolean;login?:string|null;email?:string|null;error?:string;status?:number};
function healthFailure(data:HealthResponse,responseStatus:number):string{
 if(data.error)return data.error;
 const status=data.status??responseStatus;
 if(status===401)return "GitHub rejected the stored credential (401). Reconnect GitHub to refresh access.";
 if(status===403)return "GitHub denied access (403). Check the connection permissions or rate limit.";
 if(status===429)return "GitHub temporarily limited requests (429). Try again later.";
 if(status>=500)return "GitHub connection verification is temporarily unavailable.";
 return "Connection needs attention"+(status>=400?" (HTTP "+status+")":".");
}
export default function ConnectionHealthButton({id,provider}:{id:string;provider:Provider}){
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 async function check(){
  setBusy(true);setMessage("");
  try{
   const family=provider==="github"?"github":"google";
   const response=await fetch("/api/connections/"+family+"/health",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({id})});
   const data=await response.json() as HealthResponse;
   if(!response.ok||!data.healthy)throw new Error(healthFailure(data,response.status));
   const account=data.login??data.email;
   setMessage(account?"Connected as "+account:"Connection is healthy");
  }catch(error){setMessage(error instanceof Error?error.message:"Connection check failed");}
  finally{setBusy(false);}
 }
 return <div><button type="button" onClick={check} disabled={busy}>{busy?"Checking…":"Check connection"}</button>{message?<p role="status">{message}</p>:null}</div>;
}
