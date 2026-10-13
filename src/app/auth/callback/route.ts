import {NextResponse} from "next/server";
import {createServerClient} from "@supabase/ssr";
import {getCloudflareContext} from "@opennextjs/cloudflare";

async function runtimeEnv(){
  try{
    const {env}=await getCloudflareContext({async:true});
    return env as Record<string,string|undefined>;
  }catch{
    return process.env as Record<string,string|undefined>;
  }
}

export async function GET(request:Request){
  const url=new URL(request.url);
  const code=url.searchParams.get("code");
  const requested=url.searchParams.get("next")||"/";
  const next=requested.startsWith("/")&&!requested.startsWith("//")?requested:"/";
  const env=await runtimeEnv();
  const supabaseUrl=env.NEXT_PUBLIC_SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key=env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??env.NEXT_PUBLIC_SUPABASE_ANON_KEY??process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY??process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if(!code||!supabaseUrl||!key)return NextResponse.redirect(new URL("/?auth=missing",url.origin));

  const response=NextResponse.redirect(new URL(next,url.origin));
  const supabase=createServerClient(supabaseUrl,key,{cookies:{
    getAll(){
      const cookie=request.headers.get("cookie")||"";
      return cookie.split(";").map(part=>part.trim()).filter(Boolean).map(part=>{const i=part.indexOf("=");return {name:i<0?part:part.slice(0,i),value:i<0?"":decodeURIComponent(part.slice(i+1))};});
    },
    setAll(items){items.forEach(({name,value,options})=>response.cookies.set(name,value,options));}
  }});
  const {error}=await supabase.auth.exchangeCodeForSession(code);
  if(error)return NextResponse.redirect(new URL("/?auth=error&message="+encodeURIComponent(error.message),url.origin));
  return response;
}
