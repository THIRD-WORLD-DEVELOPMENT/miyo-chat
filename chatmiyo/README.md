ChatMiyo — Full production-ready static frontend + Supabase backend

OVERVIEW
This app is a static frontend that uses Supabase (Postgres + Auth + Realtime + Storage) for persistence, realtime messaging and file uploads. Google sign-in is handled by Supabase Auth (Google provider).

FILES
- index.html
- style.css
- app.js
- sql/schema.sql
- sql/rls.sql
- netlify.toml
- README.md

SUPABASE SETUP
1. Create a Supabase project at https://app.supabase.com.
2. Go to Authentication → Providers → Google. Add your Google OAuth Client ID and Secret (create those in Google Cloud Console).
3. In Google Cloud Console, set Authorized redirect URI to:
   https://<your-supabase-project-ref>.supabase.co/auth/v1/callback
   And Authorized JavaScript origins to your Netlify URL (e.g. https://your-site.netlify.app).
4. In Supabase SQL Editor, run `sql/schema.sql` to create the tables, view and function.
5. Create a new Storage bucket named `uploads` and make it public or configure signed URL access as you prefer.
6. Optionally run `sql/rls.sql` to enable Row Level Security (RLS) and policies. Review policies before applying.
7. In Supabase → Authentication → Settings → Site URL, set your Netlify site URL.

GET KEYS
1. In Supabase dashboard Project Settings → API copy:
   - `Project URL` (SUPABASE_URL)
   - `anon` public API key (SUPABASE_ANON)

FRONTEND CONFIG
1. Open `app.js` and replace:
   - `REPLACE_SUPABASE_URL` with your `SUPABASE_URL`
   - `REPLACE_SUPABASE_ANON` with your `SUPABASE_ANON`
   OR set them as global variables in Netlify (see below).

STORAGE
- This project uses a Supabase Storage bucket named `uploads` for file uploads. You must create this bucket in the Supabase dashboard and set the appropriate public access or generate signed URLs.

DEPLOY TO NETLIFY
1. Create a new site on Netlify and connect your repo or drag & drop files.
2. Set the following environment variables in Netlify Site settings -> Build & deploy -> Environment:
   - `SUPABASE_URL` = your Supabase project URL
   - `SUPABASE_ANON` = your Supabase anon key
3. Deploy. Netlify will serve the static files; the frontend will use Supabase for auth, realtime and storage.

USAGE
- Users sign-in via Google (through Supabase).
- On first login the user will be asked to pick a username which becomes their display name in the app.
- Users can DM by username or create groups.
- Group owners can invite others by entering username in the invite control; the system will send an invite message (type 'invite') to the target as a DM. Clicking an invite message will join the group.
- Files can be uploaded in chat using the file input; files are uploaded to Supabase Storage and a message of type 'file' is created with a public URL.

SECURITY NOTES
- Enable RLS and review `sql/rls.sql` policies before applying to production.
- Make sure to secure Supabase anon keys appropriately (they are public keys but protect service_role keys if used).
- Consider stricter storage ACLs and signed URLs for private files.

NEXT STEPS I CAN DO FOR YOU
- I can push this to a GitHub repo and give you a link and a ready-to-deploy Netlify/GitHub repo structure.
- I can customize UI, add typing indicators, message reactions, message editing, search, or read receipts.
- I can implement optional server-side functions if you prefer server logic outside Supabase.

To get the zip, download the generated archive included with this message.
