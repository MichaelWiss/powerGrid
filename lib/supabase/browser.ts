/*
  SUPABASE BROWSER CLIENT
  ────────────────────────
  Uses the public anon key. Safe to use in Client Components ("use client").
  Respects Row Level Security — only returns data the RLS policies allow.

  Usage:
    import { supabaseBrowser } from '@/lib/supabase/browser';
    const { data } = await supabaseBrowser.from('generation_nodes').select('*');
*/

import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseBrowser = createClient(supabaseUrl, supabaseAnon);
