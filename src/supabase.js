import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL  = 'https://pqekervyrdrirbvwtqqz.supabase.co'
const SUPABASE_ANON = 'sb_publishable_CUMkNmYAZUOSlUxZ-cbU-g_o7PM7n9p'

export const db = createClient(SUPABASE_URL, SUPABASE_ANON)
