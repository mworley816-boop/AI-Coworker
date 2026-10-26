import {runtimeEnv} from "@/lib/runtime-env";
/**
 * Graphics provider readiness is configuration-only.
 * Never return API keys to clients, call a provider, or assume source image rights.
 */
export type GraphicsProviderReadiness={
 provider:"openai"|"none";configured:boolean;generationEnabled:boolean;
 missing:string[];message:string;
};
export async function graphicsProviderReadiness():Promise<GraphicsProviderReadiness>{
 const env=await runtimeEnv();
 const provider=(env.ATLAS_GRAPHICS_PROVIDER??"").trim().toLowerCase();
 if(provider!=="openai")return {provider:"none",configured:false,generationEnabled:false,missing:["ATLAS_GRAPHICS_PROVIDER=openai"],message:"No supported graphics provider selected."};
 const missing:string[]=[];
 if(!env.OPENAI_API_KEY?.trim())missing.push("OPENAI_API_KEY");
 const enabled=missing.length===0&&env.ATLAS_GRAPHICS_GENERATION_ENABLED==="true"&&Boolean(env.ATLAS_TRUSTED_IMAGE_ORIGIN);
 return {provider:"openai",configured:missing.length===0,generationEnabled:enabled,missing,message:missing.length?"Provider selected but credentials are missing.":enabled?"Private preview generation enabled; publication remains disabled.":"Credentials detected; set ATLAS_GRAPHICS_GENERATION_ENABLED=true and ATLAS_TRUSTED_IMAGE_ORIGIN to enable private previews."};
}
