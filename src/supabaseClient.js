import { createClient } from '@supabase/supabase-js'

// A Vercel (és a lokális .env fájl) környezeti változóit használjuk
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)