import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xamogkxhaztadvxpxeyt.supabase.co";
const supabaseKey = "sb_publishable_e15ur1Jg3W5eDDNy1Rs-jQ_htc4Uie7";

export const supabase = createClient(supabaseUrl, supabaseKey);
