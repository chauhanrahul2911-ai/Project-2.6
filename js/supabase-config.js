// ============================================================
// 🔐 SUPABASE CONFIG — REPLACE WITH YOUR OWN PROJECT'S VALUES
// ============================================================
// The URL and "anon" key below are meant to be public (same idea as
// Firebase's web config) — they only let the browser do what your Row
// Level Security policies (see supabase/schema.sql) explicitly allow.
// Never put the "service_role" key here — that one bypasses all security
// and belongs only inside the server-side webhook (as a Supabase secret).
//
// HOW TO GET YOUR OWN VALUES (one-time setup):
//   1. Go to https://supabase.com → Sign up (free, no credit card needed).
//   2. "New project" → pick a name, a database password (save it
//      somewhere), and a region close to India (e.g. Mumbai/South Asia
//      if offered) → Create.
//   3. Once the project is ready: left sidebar → Project Settings (gear
//      icon) → Data API → copy the "Project URL".
//   4. Same page → API Keys → copy the "anon" "public" key (NOT the
//      "service_role secret" one) → paste both below.
//   5. Enable Google Sign-In: Authentication → Providers → Google →
//      toggle it on. This needs a Google OAuth Client ID + Secret from
//      Google Cloud Console (console.cloud.google.com → APIs & Services
//      → Credentials → Create Credentials → OAuth client ID → Web
//      application). When creating it, add this as an Authorized
//      redirect URI (Supabase shows you the exact one to copy on the
//      same Providers → Google page): 
//        https://<your-project-ref>.supabase.co/auth/v1/callback
//      Paste the resulting Client ID + Client Secret into Supabase's
//      Google provider settings → Save.
//   6. Authentication → URL Configuration → add your GitHub Pages URL
//      (e.g. https://yourusername.github.io/Project-2.3/) to both
//      "Site URL" and "Redirect URLs" — otherwise Google will redirect
//      back to the wrong place after login.
//   7. Run the SQL in supabase/schema.sql (SQL Editor → paste → Run) to
//      create the premium_status table + its security rules.
// ============================================================

const SUPABASE_URL = "https://vuptpngnvhgisnkzeyog.supabase.co"; // e.g. "https://abcxyz.supabase.co"
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1cHRwbmdudmhnaXNua3pleW9nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYwODc0ODMsImV4cCI6MjEwMTY2MzQ4M30.2hpE95WJyjZxizH4ujZ4Yex1PPRb2S9RcmCpEY2F6g0";

function buildSupabaseClient() {
    if (SUPABASE_URL.startsWith("PASTE_") || SUPABASE_ANON_KEY.startsWith("PASTE_")) {
        // Not configured yet — app still loads, login just shows a friendly
        // error (see main.js supabaseReady()).
        return null;
    }
    try {
        // If the Supabase SDK's CDN script failed to load (ad-blocker,
        // offline, slow network), `supabase` won't exist here and this
        // throws — catch it so the REST of the app (quizzes, navigation)
        // still works. Only login/payment should fail, with a clear message.
        return supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (err) {
        console.error("Supabase SDK failed to load:", err);
        return null;
    }
}

const supabaseClient = buildSupabaseClient();
