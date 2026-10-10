type Status={ok:boolean;checks:Record<string,boolean>};
const labels:Record<string,string>={
 supabase:"Supabase authentication",appUrl:"Atlas application URL",serviceRole:"Supabase server access",
 connectionSecurity:"Connection encryption & OAuth state",githubOAuth:"GitHub OAuth",googleOAuth:"Google OAuth",
 llm:"AI model",worker:"Background worker"
};
export const dynamic="force-dynamic";
export default async function SetupPage(){
 let data:Status={ok:false,checks:{}};
 try{
   const base=process.env.NEXT_PUBLIC_APP_URL;
   if(base){const r=await fetch(new URL("/api/setup/status",base),{cache:"no-store"});if(r.ok)data=await r.json();}
 }catch{}
 return <main className="run-page"><section><a href="/">← Dashboard</a><p className="eyebrow">ATLAS</p><h1>Setup status</h1><p>This page only reports whether required configuration exists. Secret values are never displayed.</p><div>{Object.entries(labels).map(([key,label])=><article className="card" key={key}><strong>{data.checks[key]?"✓":"○"} {label}</strong><p>{data.checks[key]?"Configured":"Needs configuration"}</p></article>)}</div></section></main>;
}
