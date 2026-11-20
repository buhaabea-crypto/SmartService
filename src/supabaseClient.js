import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key || key.startsWith('sb_secret_')) {
  throw new Error('Укажите URL Supabase и публичный ключ в файле .env.')
}

export const supabase = createClient(url, key)
