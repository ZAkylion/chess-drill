import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qxrelilnksgyhnkfkcvx.supabase.co';
const supabaseAnonKey = 'sb_publishable_yQD9k380MN32hIGic_O12A_taGFVey9';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);