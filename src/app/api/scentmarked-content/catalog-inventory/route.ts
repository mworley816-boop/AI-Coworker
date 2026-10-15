import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {runtimeEnv} from "@/lib/runtime-env";

/** Read-only catalog inventory. Never writes to the Scentmarked production database. */
export async function GET(){
 const session=await createServerSupabaseClient();
 if(!session)return NextResponse.json({ok:false,error:"ATLAS_NOT_CONFIGURED"},{status:503});
 const {data:{user}}=await session.auth.getUser();
 if(!user)return NextResponse.json({ok:false,error:"SIGN_IN_REQUIRED"},{status:401});
 const env=await runtimeEnv();
 const admins=(env.SCENTMARKED_ATLAS_ADMIN_EMAILS??"").split(",").map(s=>s.trim().toLowerCase()).filter(Boolean);
 if(!user.email||!admins.includes(user.email.toLowerCase()))return NextResponse.json({ok:false,error:"ADMIN_REQUIRED"},{status:403});
 const base=env.SCENTMARKED_SUPABASE_URL;
 const key=env.SCENTMARKED_SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!key)return NextResponse.json({ok:false,error:"PRIVATE_CATALOG_READ_NOT_CONFIGURED"},{status:503});
 let origin:URL;
 try{origin=new URL(base);if(origin.protocol!=="https:")throw Error("HTTPS required");}catch{return NextResponse.json({ok:false,error:"INVALID_CATALOG_URL"},{status:503});}
 const headers=key.startsWith("sb_secret_")?{apikey:key,Accept:"application/json"}:{apikey:key,Authorization:`Bearer ${key}`,Accept:"application/json"};
 const counts=new Map<string,{house:string;total:number;statuses:Record<string,number>}>();
 let total=0;
 const pageSize=500;
 const maxRows=20000;
 try{
  for(let offset=0;offset<maxRows;offset+=pageSize){
   const url=new URL("/rest/v1/perfumes",origin);
   url.searchParams.set("select","id,status,brands(name)");
   url.searchParams.set("limit",String(pageSize));
   url.searchParams.set("offset",String(offset));
   url.searchParams.set("order","id.asc");
   const response=await fetch(url,{headers,cache:"no-store",signal:AbortSignal.timeout(12000)});
   if(!response.ok)return NextResponse.json({ok:false,error:"CATALOG_QUERY_FAILED",httpStatus:response.status},{status:502});
   const rows=await response.json() as Array<{id:string;status?:string|null;brands?:{name?:string}|{name?:string}[]|null}>;
   if(!Array.isArray(rows))return NextResponse.json({ok:false,error:"INVALID_CATALOG_RESPONSE"},{status:502});
   for(const row of rows){
    const brand=Array.isArray(row.brands)?row.brands[0]:row.brands;
    const house=brand?.name?.trim()||"Unassigned";
    const status=row.status?.trim()||"unspecified";
    const entry=counts.get(house)||{house,total:0,statuses:{}};
    entry.total++;entry.statuses[status]=(entry.statuses[status]||0)+1;
    counts.set(house,entry);total++;
   }
   if(rows.length<pageSize)return NextResponse.json({ok:true,complete:true,total,houses:[...counts.values()].sort((a,b)=>a.house.localeCompare(b.house)),scope:"admin_read_only",note:"Counts reflect catalog rows and recorded statuses, not the number of fragrances released by each house."},{headers:{"cache-control":"no-store"}});
  }
  return NextResponse.json({ok:true,complete:false,total,houses:[...counts.values()].sort((a,b)=>a.house.localeCompare(b.house)),scope:"admin_read_only",warning:"ROW_LIMIT_REACHED"},{headers:{"cache-control":"no-store"}});
 }catch{return NextResponse.json({ok:false,error:"CATALOG_UNAVAILABLE"},{status:503});}
}
