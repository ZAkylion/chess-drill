import { createClient } from '@supabase/supabase-js'

// A Vercel (és a lokális .env fájl) környezeti változóit használjuk
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
// supabaseClient.js fájl vége

export async function fetchAllRows(tableName, filterColumn, filterValue) {
  let allData = [];
  let step = 1000;
  let currentStart = 0;
  let fetchMore = true;

  while (fetchMore) {
    let query = supabase.from(tableName).select('*');
    
    // Ha van szűrés (pl. eq('allapot', 'publikus')), rátesszük
    if (filterColumn && filterValue) {
      query = query.eq(filterColumn, filterValue);
    }

    // A range(0, 999), majd range(1000, 1999) stb. lekérése
    const { data, error } = await query.range(currentStart, currentStart + step - 1);

    if (error) {
      console.error(`Hiba a(z) ${tableName} letöltésekor:`, error);
      break;
    }

    allData = [...allData, ...data];

    // Ha kevesebb adat jött vissza, mint 1000, akkor biztosan a tábla végére értünk
    if (data.length < step) {
      fetchMore = false;
    } else {
      currentStart += step;
    }
  }

  return allData;
}