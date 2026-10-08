import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {getConnectedCredential} from "@/lib/connections/credentials";
import {runtimeEnv} from "@/lib/runtime-env";

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
 const env=await runtimeEnv();
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
     try{
      const workflowList=await fetch(`https://api.github.com/repos/${resources.github.repository}/actions/workflows?per_page=100`,{headers:{Authorization:`Bearer ${credential.credential}`,Accept:"application/vnd.github+json","User-Agent":"Atlas-Scentmarked-Maintenance","X-GitHub-Api-Version":"2022-11-28"}});
      if(workflowList.ok){
       const workflowData=await workflowList.json() as {total_count?:number;workflows?:Array<{state?:string}>};
       const count=workflowData.total_count??workflowData.workflows?.length??0;
       const active=workflowData.workflows?.filter(w=>w.state==="active").length??0;
       checks.push({id:"github_workflows",label:"GitHub workflows",status:count===0?"warning":"healthy",detail:count===0?"No GitHub Actions workflows were found in Scentmarked.":`${count} workflows configured • ${active} active.`});
      }else checks.push({id:"github_workflows",label:"GitHub workflows",status:"warning",detail:`Cannot list workflows (HTTP ${workflowList.status}). Check Actions permissions.`});
      const actions=await fetch(`https://api.github.com/repos/${resources.github.repository}/actions/runs?per_page=10`,{headers:{Authorization:`Bearer ${credential.credential}`,Accept:"application/vnd.github+json","User-Agent":"Atlas-Scentmarked-Maintenance","X-GitHub-Api-Version":"2022-11-28"}});
      if(!actions.ok)checks.push({id:"github_actions",label:"GitHub Actions",status:"warning",detail:actions.status===403||actions.status===404?`Workflow history is inaccessible (HTTP ${actions.status}). Verify the connected GitHub account has Actions read access to this repository.`:`Could not inspect workflow runs (HTTP ${actions.status}).`});
      else{
       const result=await actions.json() as {workflow_runs?:Array<{name?:string;conclusion?:string|null;status?:string;html_url?:string}>};
       const runs=result.workflow_runs??[];
       const failed=runs.filter(run=>run.status==="completed"&&["failure","timed_out","cancelled","action_required"].includes(run.conclusion??""));
       const running=runs.filter(run=>run.status!=="completed").length;
       checks.push({id:"github_actions",label:"GitHub Actions",status:runs.length===0||failed.length?"warning":"healthy",detail:runs.length===0?"No workflow runs were returned. Atlas cannot confirm workflow health; check Actions permissions or whether this repository has any runs.":failed.length?`${failed.length} of the latest ${runs.length} workflow runs need attention. Most recent: ${failed[0].name??"Unnamed workflow"} (${failed[0].conclusion}).`:`Checked ${runs.length} recent workflow runs • ${running} in progress • no failures detected.`});
      }
     }catch{checks.push({id:"github_actions",label:"GitHub Actions",status:"warning",detail:"Could not retrieve recent workflow runs."});}
    }else{
     const authFailure=response.status===401;let reason="";try{const body=await response.json() as {message?:unknown};if(typeof body.message==="string")reason=body.message.slice(0,160);}catch{}checks.push({id:"github",label:"GitHub maintenance",status:"warning",detail:authFailure?`GitHub rejected the stored OAuth credential (HTTP 401${reason?`: ${reason}`:""}). Reconnect GitHub in Atlas; do not change the OAuth app secret unless reconnecting also fails.`:`GitHub connection could not access Scentmarked (HTTP ${response.status}${reason?`: ${reason}`:""}).`});
    }
   }catch{
    checks.push({id:"github",label:"GitHub maintenance",status:"warning",detail:"GitHub is connected, but the Scentmarked repository check failed."});
   }
  }
 }else checks.push({id:"github",label:"GitHub maintenance",status:"unconfigured",detail:"Repository is not configured."});

 if(resources.supabase){
  const url=env.SCENTMARKED_SUPABASE_URL;
  const key=env.SCENTMARKED_SUPABASE_PUBLISHABLE_KEY;
  if(!url||!key)checks.push({id:"supabase",label:"Scentmarked database",status:"warning",detail:"Project identified; add the Scentmarked Supabase URL and publishable key to Atlas runtime secrets for live checks."});
  else{
   try{
    const response=await fetch(url.replace(/\/$/,"")+"/rest/v1/",{headers:{apikey:key,Authorization:"Bearer "+key}});
    checks.push(response.status<500
     ?{id:"supabase",label:"Scentmarked database",status:"healthy",detail:`Scentmarked Supabase is reachable (HTTP ${response.status}) using publishable read-level credentials.`}
     :{id:"supabase",label:"Scentmarked database",status:"warning",detail:`Scentmarked Supabase returned HTTP ${response.status}.`});
   }catch{checks.push({id:"supabase",label:"Scentmarked database",status:"warning",detail:"Scentmarked Supabase could not be reached."});}
  }
 }else checks.push({id:"supabase",label:"Scentmarked database",status:"unconfigured",detail:"Supabase project is not configured."});
 const cfToken=env.SCENTMARKED_CLOUDFLARE_API_TOKEN;
 const cfAccount=env.SCENTMARKED_CLOUDFLARE_ACCOUNT_ID;
 if(!cfToken||!cfAccount){
  checks.push({id:"cloudflare",label:"Cloudflare hosting",status:"warning",detail:"Scentmarked Worker identified. Add SCENTMARKED_CLOUDFLARE_ACCOUNT_ID and read-only SCENTMARKED_CLOUDFLARE_API_TOKEN to Atlas Worker secrets to check deployments."});
 }else{
  try{
   const cf=await fetch(`https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(cfAccount)}/workers/scripts/scentmarked/deployments`,{headers:{Authorization:`Bearer ${cfToken}`,Accept:"application/json"},signal:AbortSignal.timeout(10000)});
   if(!cf.ok){let reason="";try{const payload=await cf.json() as {errors?:Array<{code?:number;message?:string}>};reason=(payload.errors??[]).slice(0,2).map(e=>`${e.code??"unknown"}: ${String(e.message??"unknown").slice(0,140)}`).join("; ");}catch{}checks.push({id:"cloudflare",label:"Cloudflare hosting",status:"warning",detail:`Cloudflare deployments API returned HTTP ${cf.status}${reason?` • ${reason}`:""}; check account ID, endpoint and token permissions.`});}
   else{
    const data=await cf.json() as {success?:boolean;result?:{deployments?:Array<{created_on?:string;versions?:Array<{version_id?:string;percentage?:number}>}>};errors?:Array<{message?:string}>};
    const deployments=data.result?.deployments??[];
    if(!data.success)checks.push({id:"cloudflare",label:"Cloudflare hosting",status:"warning",detail:"Cloudflare API did not confirm a successful response."});
    else if(deployments.length===0)checks.push({id:"cloudflare",label:"Cloudflare hosting",status:"warning",detail:"Cloudflare connection works, but no Scentmarked Worker deployments were returned."});
    else checks.push({id:"cloudflare",label:"Cloudflare hosting",status:"healthy",detail:`Cloudflare Worker reachable • ${deployments.length} deployment records • latest ${deployments[0].created_on??"date unavailable"}.`});
   }
  }catch{checks.push({id:"cloudflare",label:"Cloudflare hosting",status:"warning",detail:"Cloudflare deployment request failed or timed out."});}
 }
 const health=checks.every(c=>c.status==="healthy")?"healthy":checks.some(c=>c.status==="healthy")?"attention":"unknown";
 const now=new Date().toISOString();
 const persistedResources={...resources,maintenance:{checks,checkedAt:now}};
 const {error:updateError}=await supabase.from("workspaces").update({health,resources:persistedResources,last_checked_at:now,updated_at:now}).eq("id",workspace.id).eq("user_id",user.id);
 if(updateError)return NextResponse.json({error:updateError.message},{status:500});
 return NextResponse.json({health,checkedAt:now,checks});
}
