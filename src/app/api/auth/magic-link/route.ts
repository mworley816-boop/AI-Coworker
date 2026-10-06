import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";

export async function POST(request:Request){
  const supabase=await createServerSupabaseClient();
  if(!supabase)return NextResponse.json({error:"Supabase is not configured"},{status:503});
  let email="";
  try{const body=await request.json();email=typeof body?.email==="string"?body.email.trim():"";}catch{}
  if(!email||!email.includes("@"))return NextResponse.json({error:"Enter a valid email address"},{status:400});
  const origin=new URL(request.url).origin;
  const {error}=await supabase.auth.signInWithOtp({email,options:{emailRedirectTo:new URL("/auth/callback",origin).toString()}});
  if(error)return NextResponse.json({error:error.message},{status:400});
  return NextResponse.json({ok:true});
}
