import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://cjiwgwdymicobcrxvpoj.supabase.co'
const supabaseAnonKey = 'sb_publishable_sok74OcwTK_n26s8_Zp3Yg_Y4Y_mnt4'
export const supabase = createClient(supabaseUrl, supabaseAnonKey)  