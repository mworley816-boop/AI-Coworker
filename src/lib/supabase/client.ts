import {createBrowserClient} from "@supabase/ssr";
import {appConfig,hasSupabaseConfig} from "@/lib/config";
export function createClient(){if(!hasSupabaseConfig())return null;return createBrowserClient(appConfig.supabaseUrl,appConfig.supabasePublishableKey);}