/*
  SUPABASE SERVER CLIENT
  ───────────────────────
  Uses the service_role key — NEVER import this in a Client Component.
  This key bypasses Row Level Security and should only run on the server
  (Server Components, Route Handlers, Server Actions, seed scripts).

  The key is only available as a non-NEXT_PUBLIC_ env var, so Next.js
  will refuse to bundle it into client-side code. This is your safety net.

  Usage:
    import { supabaseServer } from '@/lib/supabase/server';
    const { data } = await supabaseServer.from('generation_nodes').select('*');
*/

import { createClient } from '@supabase/supabase-js';

const supabaseUrl         = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabaseServer = createClient(supabaseUrl, supabaseServiceRole, {
  auth: {
    // Disable automatic session persistence — this client is stateless on the server.
    persistSession: false,
    autoRefreshToken: false,
  },
});
