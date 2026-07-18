import { createClient } from '@supabase/supabase-js';

const cleanEnvVar = (value: string | undefined | null) => {
  if (!value) return '';
  let cleaned = value.trim();
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.substring(1, cleaned.length - 1);
  }
  return cleaned;
};

let localUrl = localStorage.getItem('local_supabase_url');
let localKey = localStorage.getItem('local_supabase_key');

let supabaseUrl = cleanEnvVar(localUrl || import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = cleanEnvVar(localKey || import.meta.env.VITE_SUPABASE_ANON_KEY);

if (supabaseUrl.endsWith('/rest/v1/')) {
  supabaseUrl = supabaseUrl.slice(0, -9);
} else if (supabaseUrl.endsWith('/rest/v1')) {
  supabaseUrl = supabaseUrl.slice(0, -8);
}

if (supabaseUrl && !supabaseUrl.startsWith('http')) {
  supabaseUrl = `https://${supabaseUrl}`;
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');
