import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {getConnectedCredential} from "@/lib/connections/credentials";

type Check={id:string;label:string;status:"healthy"|"warning"|"unconfigured";detail:string};

export async function POST(){
 const supabase=await createServerSupabaseClient();
 if(!supabase)return NextResponse.json({error:"Supabase is not configured."},{status:503});
 const {data:{user}}=await supabase.auth.getUser();
 if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});
 const {data:workspace,error}=await supabase.from("workspaces").select("id,resources").eq("user_id",user.id).eq("slug","scentmarked").maybeSingle();
 if(error)return NextResponse.json({error:error.message},{status:500});
 if(!workspace)return NextResponse.json({error:"Set up the Scentmarked workspace first."},{status:404});
 const resources=(workspace.resources??{}) as {github?:{repository?:string};supabase?:unknown;cloudflare?:unknown};
 const checks:Check[]=[{id:"workspace",label:"Atlas workspace",status:"healthy",detail:"Scentmarked is configured as Atlas's priority workspace."}];

 if(resources.github?.repository){
  const credential=await getConnectedCredential(user.id,"github");
  if(!credential.ok){
   checks.push({id:"github",label:"GitHub maintenance",status:"warning",detail:credential.message});
  }else{
   try{
    const response=await fetch(`https://api.github.com/repos/${resources.github.repository}`,{headers:{Authorization:`Bearer ${credential.credential}`,Accept:"application/vnd.github+json","User-Agent":"Atlas-Scentmarked-Maintenance"}});
    if(response.ok){
     const repo=await response.json() as {full_name?:string;default_branch?:string;permissions?:{pull?:boolean;push?:boolean}};
     const access=repo.permissions?.push?"read/write":repo.permissions?.pull?"read":"available";
     checks.push({id:"github",label:"GitHub maintenance",status:"healthy",detail:`${repo.full_name??resources.github.repository} reachable • ${access} access • default branch ${repo.default_branch??"unknown"}`});
    }else{
     checks.push({id:"github",label:"GitHub maintenance",status:"warning",detail:`GitHub connection could not access Scentmarked (HTTP ${response.status}).`});
    }
   }catch{
    checks.push({id:"github",label:"GitHub maintenance",status:"warning",detail:"GitHub is connected, but the Scentmarked repository check failed."});
   }
  }
 }else checks.push({id:"github",label:"GitHub maintenance",status:"unconfigured",detail:"Repository is not configured."});

 checks.push(
  {id:"supabase",label:"Scentmarked database",status:resources.supabase?"warning":"unconfigured",detail:resources.supabase?"Project identified; Atlas still needs a controlled Scentmarked database connection.":"Supabase project is not configured."},
  {id:"cloudflare",label:"Cloudflare hosting",status:resources.cloudflare?"warning":"unconfigured",detail:resources.cloudflare?"Hosting identified; Atlas still needs a Cloudflare runtime connection for deployment health.":"Cloudflare hosting is not configured."}
 );
 const health=checks.every(c=>c.status==="healthy")?"healthy":checks.some(c=>c.status==="healthy")?"attention":"unknown";
 const now=new Date().toISOString();
 const {error:updateError}=await supabase.from("workspaces").update({health,last_checked_at:now,updated_at:now}).eq("id",workspace.id).eq("user_id",user.id);
 if(updateError)return NextResponse.json({error:updateError.message},{status:500});
 return NextResponse.json({health,checkedAt:now,checks});
}
