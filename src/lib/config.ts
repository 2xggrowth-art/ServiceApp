export const config = {
  useSupabase: import.meta.env.VITE_USE_SUPABASE === 'true',
  supabaseUrl: (import.meta.env.VITE_SUPABASE_URL as string) || '',
  supabaseAnonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '',
  googleSheetsUrl: (import.meta.env.VITE_GOOGLE_SHEETS_URL as string) || '',
} as const;
