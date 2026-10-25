import {NextResponse} from "next/server";
import {createServerSupabaseClient} from "@/lib/supabase/server";
import {graphicsProviderReadiness} from "@/lib/graphics/provider-readiness";
export async function GET(){
 const s=await createServerSupabaseClient();if(!s)return NextResponse.json({ok:false,reason:"Supabase unavailable"},{status:503});
 const {data:{user}}=await s.auth.getUser();if(!user)return NextResponse.json({ok:false,reason:"Sign in required"},{status:401});
 const readiness=await graphicsProviderReadiness();
 return NextResponse.json({ok:true,readiness});
}
