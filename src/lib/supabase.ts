import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from './config';

export const supabase: SupabaseClient | null = config.useSupabase
  ? createClient(config.supabaseUrl, config.supabaseAnonKey)
  : null;
