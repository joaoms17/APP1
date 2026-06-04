import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://ibthtjxeyzdrtwtfuzyj.supabase.co'
const SUPABASE_ANON = 'sb_publishable_l17_aIPHKUqUoi4lKoGnEQ_4ktw_PY5'

export const db = createClient(SUPABASE_URL, SUPABASE_ANON)
