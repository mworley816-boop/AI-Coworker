export type ProviderRequestResult={ok:true;response:Response}|{ok:false;message:string;outcome:"confirmed_failure"|"uncertain";status?:number};

export async function postProviderJson(endpoint:string|undefined,key:string|undefined,payload:Record<string,unknown>,provider:string,timeoutMs=20_000):Promise<ProviderRequestResult>{
  if(!endpoint||!key)return {ok:false,message:`${provider} is not configured`,outcome:"confirmed_failure"};
  let url:URL;
  try{url=new URL(endpoint);}catch{return {ok:false,message:`${provider} URL is invalid`,outcome:"confirmed_failure"};}
  if(url.protocol!=="https:")return {ok:false,message:`${provider} must use HTTPS`,outcome:"confirmed_failure"};
  const controller=new AbortController();
  const timeout=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(url,{method:"POST",headers:{"content-type":"application/json",authorization:`Bearer ${key}`},body:JSON.stringify(payload),signal:controller.signal});
    if(!response.ok)return {ok:false,message:`${provider} returned ${response.status}`,outcome:response.status>=500?"uncertain":"confirmed_failure",status:response.status};
    return {ok:true,response};
  }catch(error){
    return {ok:false,message:error instanceof Error&&error.name==="AbortError"?`${provider} timed out`:`${provider} request failed`,outcome:"uncertain"};
  }finally{clearTimeout(timeout);}
}
