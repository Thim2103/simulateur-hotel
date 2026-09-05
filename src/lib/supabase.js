import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = supabaseUrl && supabaseKey
	? createClient(supabaseUrl, supabaseKey)
	: null;

export function assertSupabaseConfigured() {
	if (!supabase) {
		throw new Error("Supabase n'est pas configure. Definissez REACT_APP_SUPABASE_URL et REACT_APP_SUPABASE_ANON_KEY.");
	}
	return supabase;
}
