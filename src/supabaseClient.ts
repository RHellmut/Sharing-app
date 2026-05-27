import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !key) {
  throw new Error(
    'Supabase ist nicht konfiguriert. ' +
    'Bitte VITE_SUPABASE_URL und VITE_SUPABASE_ANON_KEY als ' +
    'Umgebungsvariablen setzen (siehe .env.example).',
  );
}

export const supabase = createClient(url, key);
