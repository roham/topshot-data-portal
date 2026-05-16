// Supabase admin client (service-role key, bypasses RLS — required for ETL writes).

import { createClient } from "@supabase/supabase-js";
import { CONFIG, requireSupabaseCreds } from "../etl-config.mjs";

let _sb = null;
export function sbAdmin() {
  if (_sb) return _sb;
  requireSupabaseCreds();
  _sb = createClient(CONFIG.supabaseUrl, CONFIG.supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: "topshot" }, // default schema for this client
    global: {
      headers: { "x-application-name": "topshot-etl" },
    },
  });
  return _sb;
}
