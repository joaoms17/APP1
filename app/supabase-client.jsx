// supabase-client.jsx
// ⚠️  Preencha as suas credenciais do Supabase:
//     Dashboard → Project Settings → API
//
// SUPABASE_URL  → "Project URL"   ex: https://abcxyz.supabase.co
// SUPABASE_ANON → "anon / public" key

const SUPABASE_URL  = 'https://YOUR_PROJECT.supabase.co';
const SUPABASE_ANON = 'YOUR_ANON_KEY';

// ── Deteta se as credenciais foram preenchidas ──────────────
const SUPABASE_CONFIGURED = (
  SUPABASE_URL.startsWith('https://') &&
  !SUPABASE_URL.includes('YOUR_PROJECT') &&
  SUPABASE_ANON.length > 20 &&
  !SUPABASE_ANON.includes('YOUR_ANON')
);

let db = null;
if (SUPABASE_CONFIGURED) {
  // window.supabase é exposto pelo CDN carregado em Ramo.html
  db = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON);
  console.log('[Ramo] Supabase ligado ✓');
} else {
  console.warn('[Ramo] Supabase não configurado — a usar dados de demonstração.');
}

Object.assign(window, { db, SUPABASE_CONFIGURED });
