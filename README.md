ChatMiyo - Full app (Supabase + Netlify)

1) In Supabase SQL Editor run sql/schema.sql then sql/rls.sql
2) Create a Storage bucket named 'uploads' (public or private; UI uses public url)
3) In Supabase Auth -> Providers enable Google and set Client ID & Secret.
4) In Google Cloud Console set Authorized redirect URI to:
   https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
   and Authorized JavaScript origin to your Netlify site URL.
5) In Supabase Project Settings -> API copy Project URL and anon key.
6) In Netlify Site Settings -> Environment -> Add variables:
   SUPABASE_URL = https://<your-project>.supabase.co
   SUPABASE_ANON = <anon public key>
7) Deploy: drag & drop these files to Netlify (or push to GitHub and connect).
8) After deploy, open site, sign in with Google, pick username, then create DMs/groups, add friends, invite, and chat.
