import {runtimeEnv} from "@/lib/runtime-env";
import {validateReferenceUrl} from "./reference-url-safety";
/** Configuration-only checks; never disclose secret values or call OpenAI. */
export type GraphicsProviderReadiness={
 provider:"openai"|"none";configured:boolean;generationEnabled:boolean;
 missing:string[];message:string;checks:{name:string;ready:boolean;detail:string}[];
};
export function assessGraphicsProviderConfig(env:Record<string,string|undefined>):GraphicsProviderReadiness{
 const provider=(env.ATLAS_GRAPHICS_PROVIDER??"").trim().toLowerCase();
 const origin=(env.ATLAS_TRUSTED_IMAGE_ORIGIN??"").trim();
 let validOrigin=false;
 try{
  const parsed=new URL(origin);
  validOrigin=parsed.protocol==="https:"&&parsed.pathname==="/"&&!parsed.search&&!parsed.hash&&!parsed.username&&!parsed.password&&validateReferenceUrl(origin).valid;
 }catch{/* missing or invalid origin */}
 const checks=[
  {name:"Provider",ready:provider==="openai",detail:provider==="openai"?"OpenAI selected":"Set ATLAS_GRAPHICS_PROVIDER=openai"},
  {name:"Credentials",ready:Boolean(env.OPENAI_API_KEY?.trim()),detail:env.OPENAI_API_KEY?.trim()?"API key present (not validated against provider)":"Set OPENAI_API_KEY as a server-side secret"},
  {name:"Trusted image origin",ready:validOrigin,detail:validOrigin?"HTTPS origin accepted (not tested for reachability)":"Set ATLAS_TRUSTED_IMAGE_ORIGIN to an operator-controlled public HTTPS origin"},
  {name:"Generation switch",ready:env.ATLAS_GRAPHICS_GENERATION_ENABLED==="true",detail:env.ATLAS_GRAPHICS_GENERATION_ENABLED==="true"?"Enabled":"Set ATLAS_GRAPHICS_GENERATION_ENABLED=true after review"}
 ];
 const missing=checks.filter(c=>!c.ready).map(c=>c.detail);
 const enabled=checks.every(c=>c.ready);
 return {provider:provider==="openai"?"openai":"none",configured:checks[0].ready&&checks[1].ready,generationEnabled:enabled,missing,checks,message:enabled?"Configuration checks passed. Run an explicit authenticated preview to verify live generation; publishing remains disabled.":"Graphics preview is not ready. Resolve the configuration checks below."};
}
export async function graphicsProviderReadiness():Promise<GraphicsProviderReadiness>{
 return assessGraphicsProviderConfig(await runtimeEnv());
}
