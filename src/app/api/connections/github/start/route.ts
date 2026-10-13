import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {createConnectionState} from "@/lib/connections/state";
import {runtimeEnv} from "@/lib/runtime-env";

function failure(request:Request,redirectMode:boolean,stage:string,message:string,status=500){
 if(redirectMode){const u=new URL("/connections",new URL(request.url).origin);u.searchParams.set("github","start_failed");u.searchParams.set("stage",stage);u.searchParams.set("detail",message);return NextResponse.redirect(u);}
 return NextResponse.json({error:message,stage},{status});
}
async function start(request:Request,redirectMode=false){
 try{
  const supabase=await createServerSupabaseClient();
  if(!supabase)return failure(request,redirectMode,"supabase","Atlas Supabase is not configured",503);
  const {data:{user},error:authError}=await supabase.auth.getUser();
  if(authError||!user)return failure(request,redirectMode,"session","Atlas could not verify your signed-in session",401);
  const env=await runtimeEnv();
  const clientId=env.GITHUB_OAUTH_CLIENT_ID;
  const appUrl=env.NEXT_PUBLIC_APP_URL;
  if(!clientId)return failure(request,redirectMode,"client_id","GITHUB_OAUTH_CLIENT_ID is not available to the Worker",503);
  if(!appUrl)return failure(request,redirectMode,"app_url","NEXT_PUBLIC_APP_URL is not available to the Worker",503);
  if(!env.CONNECTION_STATE_SECRET)return failure(request,redirectMode,"state_secret","CONNECTION_STATE_SECRET is not available to the Worker",503);
  let body:unknown={};
  if(request.method==="POST"){try{body=await request.json();}catch{body={};}}
  const label=body&&typeof body==="object"&&typeof (body as Record<string,unknown>).label==="string"?String((body as Record<string,unknown>).label).trim():"Personal GitHub";
  if(!label||label.length>100)return failure(request,redirectMode,"label","Invalid connection label",400);
  const {data,error}=await supabase.from("connections").upsert({user_id:user.id,provider:"github",label,status:"connecting",updated_at:new Date().toISOString()},{onConflict:"user_id,provider,label"}).select("id").single();
  if(error||!data)return failure(request,redirectMode,"connection_row",error?.message??"Could not prepare GitHub connection",500);
  let state:string;
  try{state=createConnectionState({userId:user.id,connectionId:data.id,provider:"github"},env.CONNECTION_STATE_SECRET);}
  catch{return failure(request,redirectMode,"oauth_state","Could not create secure GitHub authorization state",500);}
  const callback=new URL("/api/connections/github/callback",appUrl).toString();
  const url=new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id",clientId);url.searchParams.set("redirect_uri",callback);url.searchParams.set("scope","read:user repo");url.searchParams.set("state",state);
  return redirectMode?NextResponse.redirect(url):NextResponse.json({authorizeUrl:url.toString(),stage:"ready"});
 }catch(error){return failure(request,redirectMode,"unexpected",error instanceof Error?error.message:"Unexpected GitHub start error",500);}
}
export async function POST(request:Request){return start(request,false);}
export async function GET(request:Request){return start(request,true);}
