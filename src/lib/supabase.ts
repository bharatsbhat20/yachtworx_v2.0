import { createClient } from '@supabase/supabase-js';
import type { Database } from './supabaseTypes';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * True when no Supabase credentials are configured.
 * In demo mode all stores fall back to mock data / localStorage.
 */
export const isDemoMode = !supabaseUrl || !supabaseAnonKey;

/**
 * The Supabase client.  Will be null in demo mode — always guard with `isDemoMode`
 * before calling any Supabase method.
 */
export const supabase = isDemoMode
  ? null
  : createClient<Database>(supabaseUrl!, supabaseAnonKey!);
