import {NextResponse} from "next/server";

const present=(name:string)=>Boolean(process.env[name]?.trim());

export async function GET(){
  const checks={
    supabase:present("NEXT_PUBLIC_SUPABASE_URL")&&(present("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")||present("NEXT_PUBLIC_SUPABASE_ANON_KEY")),
    appUrl:present("NEXT_PUBLIC_APP_URL"),
    serviceRole:present("SUPABASE_SERVICE_ROLE_KEY"),
    connectionSecurity:present("CONNECTION_STATE_SECRET")&&present("CONNECTION_ENCRYPTION_KEY"),
    githubOAuth:present("GITHUB_OAUTH_CLIENT_ID")&&present("GITHUB_OAUTH_CLIENT_SECRET"),
    googleOAuth:present("GOOGLE_OAUTH_CLIENT_ID")&&present("GOOGLE_OAUTH_CLIENT_SECRET"),
    llm:present("LLM_API_URL")&&present("LLM_API_KEY")&&present("LLM_MODEL"),
    worker:present("WORKER_SECRET")
  };
  return NextResponse.json({ok:checks.supabase&&checks.appUrl,checks},{headers:{"Cache-Control":"no-store"}});
}
