# Smart Bookmark App

A production-ready bookmark manager built with **Next.js 16**, **Supabase**, **TypeScript**, and **Tailwind CSS v4**.

## Features

- Google OAuth authentication (no email/password)
- Private bookmarks — users see only their own
- Real-time sync across browser tabs via Supabase Realtime
- Row-Level Security enforced at the database level
- Fully deployable on Vercel

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Auth | Supabase Auth (Google OAuth) |
| Database | Supabase PostgreSQL |
| Realtime | Supabase Realtime |
| Deployment | Vercel |

---

## STEP 1 — Project Setup Commands

```bash
# Clone the repo
git clone <your-repo-url>
cd bookmarkapp

# Install dependencies (installs Supabase SSR + JS packages)
npm install

# Copy environment variables template
cp .env.local.example .env.local
# → Fill in your Supabase URL and anon key (see STEP 2)
```

---

## STEP 2 — Supabase Setup Guide

### 2.1 Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New Project**.
3. Fill in: name, database password, region → **Create Project**.
4. Wait for provisioning (~1 minute).

### 2.2 Get API Credentials

1. Go to **Settings → API** in your Supabase dashboard.
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Paste both into `.env.local`.

### 2.3 Enable Google OAuth

1. Go to **Authentication → Providers → Google**.
2. Toggle **Enable** on.
3. You need a Google OAuth 2.0 Client ID and Secret:
   - Go to [Google Cloud Console](https://console.cloud.google.com/).
   - Create or select a project.
   - Enable **Google+ API** (or **People API**).
   - Go to **APIs & Services → Credentials → Create Credentials → OAuth Client ID**.
   - Application type: **Web application**.
   - Authorized redirect URIs — add:
     ```
     https://<your-project-ref>.supabase.co/auth/v1/callback
     ```
   - Copy the **Client ID** and **Client Secret**.
4. Paste both into the Supabase Google provider form → **Save**.

### 2.4 Add Site URL

1. Go to **Authentication → URL Configuration**.
2. Set **Site URL** to:
   - Local: `http://localhost:3000`
   - Production: `https://your-vercel-domain.vercel.app`
3. Add to **Redirect URLs**:
   ```
   http://localhost:3000/auth/callback
   https://your-vercel-domain.vercel.app/auth/callback
   ```

---

## STEP 3 — Database SQL + RLS Policies

Run the following SQL in the **Supabase SQL Editor** (Dashboard → SQL Editor → New Query):

```sql
-- ─────────────────────────────────────────────────────────────
-- 1. Create the bookmarks table
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  url        TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────────────────
-- 2. Enable Row-Level Security
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- ─────────────────────────────────────────────────────────────
-- 3. RLS Policies
-- ─────────────────────────────────────────────────────────────

-- SELECT: users can only read their own bookmarks
CREATE POLICY "Users can view own bookmarks"
  ON public.bookmarks
  FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: users can only insert bookmarks for themselves
CREATE POLICY "Users can insert own bookmarks"
  ON public.bookmarks
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- DELETE: users can only delete their own bookmarks
CREATE POLICY "Users can delete own bookmarks"
  ON public.bookmarks
  FOR DELETE
  USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────
-- 4. Index for faster per-user queries
-- ─────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS bookmarks_user_id_idx
  ON public.bookmarks (user_id);

-- ─────────────────────────────────────────────────────────────
-- 5. Enable Realtime for the bookmarks table
-- ─────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookmarks;
```

> **Important:** After running the SQL, go to **Database → Replication** in your Supabase dashboard and confirm that `bookmarks` appears under the `supabase_realtime` publication.

---

## STEP 4 — Project Folder Structure

```
bookmarkapp/
├── src/
│   ├── app/
│   │   ├── auth/
│   │   │   └── callback/
│   │   │       └── route.ts          # OAuth code exchange
│   │   ├── dashboard/
│   │   │   └── page.tsx              # Protected bookmark dashboard
│   │   ├── login/
│   │   │   └── page.tsx              # Login page (Google OAuth)
│   │   ├── globals.css
│   │   ├── layout.tsx                # Root layout
│   │   └── page.tsx                  # Root redirect
│   ├── components/
│   │   ├── AddBookmarkForm.tsx       # Add bookmark form (client)
│   │   ├── BookmarkCard.tsx          # Single bookmark row (client)
│   │   ├── BookmarkList.tsx          # Realtime list (client)
│   │   ├── LoginButton.tsx           # Google OAuth button (client)
│   │   └── LogoutButton.tsx          # Sign-out button (client)
│   ├── lib/
│   │   ├── supabaseClient.ts         # Browser Supabase client
│   │   ├── supabaseServer.ts         # Server-side Supabase client
│   │   └── types.ts                  # Shared TypeScript types
│   └── middleware.ts                 # Auth route protection
├── .env.local                        # (gitignored) Real env vars
├── .env.local.example                # Template — commit this
├── next.config.ts
├── package.json
├── postcss.config.mjs
└── tsconfig.json
```

---

## STEP 5 — Code Summary

### Authentication Flow

1. User visits `/` → middleware checks session → redirects to `/login` if unauthenticated.
2. User clicks "Continue with Google" → `supabase.auth.signInWithOAuth()` → redirected to Google.
3. Google redirects back to `/auth/callback?code=...`.
4. Route handler exchanges the code for a session via `exchangeCodeForSession()`.
5. Session cookies are set → user is redirected to `/dashboard`.
6. On every request, middleware calls `supabase.auth.getUser()` which silently refreshes the token if needed.

### Protected Routes

- `src/middleware.ts` guards all routes.
- Unauthenticated requests to any non-`/login` / non-`/auth` path are redirected to `/login`.
- Authenticated requests to `/login` are redirected to `/dashboard`.
- Server components double-check auth with `supabase.auth.getUser()` (defense in depth).

### Bookmark CRUD

| Operation | Where | Security |
|---|---|---|
| Read | Server Component (initial load) + Realtime | RLS SELECT policy |
| Create | Client Component → Supabase JS | RLS INSERT policy |
| Delete | Client Component → Supabase JS | RLS DELETE policy |

---

## STEP 6 — Realtime Implementation

`BookmarkList.tsx` subscribes to Postgres changes filtered by the current user:

```typescript
const channel = supabase
  .channel(`bookmarks:user:${userId}`)
  .on('postgres_changes', {
    event: '*',           // INSERT | UPDATE | DELETE
    schema: 'public',
    table: 'bookmarks',
    filter: `user_id=eq.${userId}`,  // Only this user's rows
  }, (payload) => {
    // Merge payload into local state
  })
  .subscribe()

// Cleanup on component unmount
return () => { supabase.removeChannel(channel) }
```

**How cross-tab sync works:**

1. Tab A inserts a bookmark → Supabase writes to DB → broadcasts a change event.
2. Tab B's active subscription receives the event.
3. Tab B's `setBookmarks()` state update causes an immediate re-render — no polling needed.

**Duplicate prevention:** The INSERT handler checks whether the new row already exists in state before adding it, preventing duplicate entries when the local tab's optimistic state and the realtime echo arrive close together.

---

## STEP 7 — Vercel Deployment

### 7.1 Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Smart Bookmark App"
git remote add origin https://github.com/<your-username>/smart-bookmark-app.git
git push -u origin main
```

### 7.2 Import on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**.
2. Import your GitHub repository.
3. Framework preset: **Next.js** (auto-detected).
4. Under **Environment Variables**, add:
   ```
   NEXT_PUBLIC_SUPABASE_URL      = https://your-project-ref.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = your-anon-key-here
   ```
5. Click **Deploy**.

### 7.3 Post-Deployment

After you get your Vercel URL (e.g., `https://smart-bookmark-app.vercel.app`):

1. **Supabase → Authentication → URL Configuration:**
   - Update **Site URL** to your Vercel URL.
   - Add `https://smart-bookmark-app.vercel.app/auth/callback` to **Redirect URLs**.

2. **Google Cloud Console → OAuth Client:**
   - Add `https://smart-bookmark-app.vercel.app` to **Authorized JavaScript Origins**.
   - Add `https://<your-project-ref>.supabase.co/auth/v1/callback` to **Authorized Redirect URIs** (already done in STEP 2 if you used the Supabase callback URL).

3. Redeploy on Vercel if you changed any environment variables.

---

## Local Development

```bash
# Install dependencies
npm install

# Copy env template and fill in your Supabase credentials
cp .env.local.example .env.local

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables Reference

| Variable | Description | Where to find |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key | Supabase → Settings → API |

> Both variables are prefixed with `NEXT_PUBLIC_` so they are available in the browser for the client-side Supabase instance. The anon key is safe to expose — access is controlled by RLS policies.

---

## Security Model

| Threat | Mitigation |
|---|---|
| Unauthorized data access | RLS policies: every query is scoped to `auth.uid()` |
| Session hijacking | HTTP-only cookies managed by Supabase SSR |
| Cross-tab data leaks | Filter on `user_id` in realtime subscription |
| CSRF on delete | `user_id` filter in delete query (belt + suspenders with RLS) |
| Open redirect | Hardcoded redirect paths; no user-controlled redirect values |

---

## License

MIT
