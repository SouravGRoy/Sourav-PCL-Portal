import { createBrowserClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env.local file.');
}

// Browser client for client components
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Create a Supabase client for server components
export const createServerClient = () => {
  return createClient(supabaseUrl!, supabaseAnonKey!);
};