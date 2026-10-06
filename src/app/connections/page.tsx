import ConnectionHealthButton from "@/components/ConnectionHealthButton";
import GitHubConnectButton from "@/components/GitHubConnectButton";
import GoogleConnectButton from "@/components/GoogleConnectButton";
import DisconnectConnectionButton from "@/components/DisconnectConnectionButton";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {personalConnectionProviders} from "@/lib/connections";

export const dynamic="force-dynamic";

export default async function ConnectionsPage(){
 const supabase=await createServerSupabaseClient();
 if(!supabase)return <main className="run-page"><section><a href="/">← Dashboard</a><h1>Connections</h1><p>Atlas database configuration is unavailable.</p></section></main>;
 const {data:{user},error:authError}=await supabase.auth.getUser();
 if(authError||!user)return <main className="run-page"><section><a href="/">← Dashboard</a><p className="eyebrow">ATLAS</p><h1>Connections</h1><p>Sign in to manage Atlas connections.</p></section></main>;
 const {data,error}=await supabase.from("connections").select("id,provider,label,status,scopes,connected_at,last_checked_at").order("provider");
 if(error)return <main className="run-page"><section><a href="/">← Dashboard</a><p className="eyebrow">ATLAS</p><h1>Connections</h1><p>Connections could not be loaded: {error.message}</p></section></main>;
 const connections=data??[];
 return <main className="run-page"><section><a href="/">← Dashboard</a><p className="eyebrow">ATLAS • SCENTMARKED PRIORITY</p><h1>Connections</h1><p>Connect the systems Atlas needs for Scentmarked maintenance. Credentials remain encrypted and server-side.</p><div>{personalConnectionProviders.map(provider=>{const items=connections.filter(item=>item.provider===provider);return <article className="card" key={provider}><h2>{provider[0].toUpperCase()+provider.slice(1)}</h2>{provider==="github"?<p>GitHub gives Atlas repository and deployment visibility for Scentmarked.</p>:null}{provider==="github"&&!items.some(item=>item.status==="connected")?<GitHubConnectButton/>:null}{provider!=="github"&&!items.some(item=>item.status==="connected")?<GoogleConnectButton provider={provider}/>:null}{items.length?items.map(item=><div key={item.id}><strong>{item.label}</strong><p>Status: {item.status}</p><p>{item.scopes?.length?"Access: "+item.scopes.join(", "):"No access scopes recorded yet."}</p>{item.status==="connected"?<ConnectionHealthButton id={item.id} provider={provider}/>:null}{item.status==="connected"?<DisconnectConnectionButton id={item.id}/>:null}</div>):<p>Not connected yet.</p>}</article>;})}</div><small data-build="connections-runtime-v2">build connections-runtime-v2</small></section></main>;
}
