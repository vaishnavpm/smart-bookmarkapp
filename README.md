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

## Problems Encountered & How I Solved Them

This section documents every significant issue hit during development — the symptom, root cause, and fix.

---

### 1. Next.js 16 renamed `middleware.ts` → `proxy.ts`

**Symptom:** Dev server printed:
```
The `middleware` file convention is deprecated. Use `proxy.ts` instead.
```
Then after creating both files: *"Both middleware file and proxy file are detected"*.

**Root cause:** Next.js 16 changed the middleware file name convention. The exported function name also changed from `middleware` to `proxy`.

**Fix:** Renamed `src/middleware.ts` to `src/proxy.ts`, renamed the export, deleted the old file, and cleared the `.next` build cache. The cache had to be wiped because Next.js had cached the old file reference and kept detecting both.

---

### 2. Environment variables not loading — "supabaseUrl is required"

**Symptom:** App crashed on startup with *"supabaseUrl is required"* even though credentials were in a `.env.local.example` file.

**Root cause:** Next.js reads `.env.local` only — not `.env.local.example`. The example file is documentation; it is never loaded automatically.

**Fix:** Created a real `.env.local` file at the project root with actual Supabase credentials. Lesson: always check that your env file has the exact name Next.js expects.

---

### 3. Adding or deleting a bookmark required a page refresh

**Symptom:** Clicking "Add" or "Delete" succeeded in the database but the UI didn't update until the page was manually refreshed.

**Root cause — part 1 (unstable Supabase client):** `createClient()` was called directly in the component body. Each re-render created a new Supabase instance, causing the `useEffect` that sets up the Realtime subscription to teardown and re-subscribe in a loop, never stabilising.

**Fix:** Wrapped client creation in `useMemo(() => createClient(), [])` so the reference stays stable across renders.

**Root cause — part 2 (no optimistic updates):** Even with a stable client, Realtime events have a small async delay. Without immediate local state mutation, the UI felt broken.

**Fix:** Added optimistic updates — mutate local state immediately on user action. The Realtime event confirms. On DB error, roll back the state and show an error message.

---

### 4. Real-time INSERT not syncing to other open tabs (but DELETE worked)

**Symptom:** Tab A deletes a bookmark → Tab B updates instantly. Tab A adds a bookmark → Tab B never updates without a refresh.

**Root cause:** The INSERT event handler had a guard:
```typescript
if (payload.new.user_id !== currentUserId) return
```
This looks correct, but with RLS enabled on the anon key, Supabase Realtime redacts sensitive columns — `payload.new.user_id` arrives as `undefined`. So the condition always evaluated to `true` and every cross-tab INSERT was silently discarded.

DELETE events worked because the DELETE handler had no such guard.

**Fix:** Removed the `user_id` guard from the INSERT handler entirely. RLS already guarantees that only the authenticated user's events are delivered through the channel — the client-side guard was redundant and broken. To prevent same-tab echo (the tab that added the bookmark also receives the INSERT event), I deduplicate by `id`: if the id already exists in local state, skip it.

---

### 5. Logging out in Tab A left Tab B on the dashboard

**Symptom:** Signing out in one tab cleared the session, but other open tabs stayed on the dashboard fully functional — no redirect.

**Root cause:** The logout button called `router.push('/login')` only in the tab where it was clicked. Other tabs had no mechanism to detect the session change.

**Fix:** Created an `AuthListener` component that subscribes to `supabase.auth.onAuthStateChange`. Supabase uses `localStorage` for session state and emits a `storage` event when it changes — `onAuthStateChange` listens for this cross-tab. On receiving `SIGNED_OUT`, it calls `router.push('/login')` in that tab. The component is mounted in the dashboard layout so it runs in every open tab simultaneously.

---

### 6. Hydration mismatch from `toLocaleDateString()`

**Symptom:**
```
Hydration failed because the server rendered text didn't match the client.
Server: "Jan 15, 2025"   Client: "1/15/2025"
```

**Root cause:** `Date.toLocaleDateString()` with no arguments uses the runtime's default locale. Node.js (server-side) and the browser often have different default locales, producing different date strings for the same value.

**Fix:** Passed an explicit locale and format options:
```typescript
new Date(bookmark.created_at).toLocaleDateString('en-US', {
  month: 'short', day: 'numeric', year: 'numeric',
})
```
This makes the output identical on both server and client regardless of the system locale.

---

### 7. URL validation accepted garbage inputs like `asdadasd.asdasda`

**Symptom:** Typing `asdadasd.asdasda` as a URL passed validation and was saved.

**Root cause:** Initial validation only checked that the string started with `http://`/`https://` and that `new URL()` didn't throw. `new URL('https://asdadasd.asdasda')` succeeds — it is syntactically valid even though `.asdasda` is not a real top-level domain.

**Fix:** Added the `tldts` package and called `getDomain()` on the URL. `tldts` validates against the Public Suffix List (the same database browsers use). If `getDomain()` returns `null`, the form rejects the URL.

---

### 8. Extra internal spaces in titles saved as-is

**Symptom:** A title like `"hello     world"` was saved and displayed with the original extra spaces.

**Root cause:** `.trim()` only strips leading and trailing whitespace. It does not collapse internal runs of spaces.

**Fix:** Added a `normalizeTitle` function:
```typescript
function normalizeTitle(raw: string) {
  return raw.trim().replace(/\s+/g, ' ')
}
```

---

### 9. Duplicate bookmarks could be saved

**Symptom:** Submitting the same URL twice created duplicate rows in the database.

**Fix:** Before submitting, `AddBookmarkForm` normalizes both the new URL and every existing bookmark URL (lowercase, prepend `https://` if missing, strip trailing slash) and checks for a match. If a duplicate is found, it shows a validation error instead of submitting.

---

### 10. TypeScript build error on Vercel — implicit `any`

**Symptom:** Vercel CI build failed:
```
Parameter 'cookiesToSet' implicitly has an 'any' type.
```
The error never appeared locally in `npm run dev`.

**Root cause:** `next dev` runs with relaxed TypeScript checking. `next build` (used in CI/CD) invokes the TypeScript compiler in strict mode. The `setAll` cookie callback parameter had no type annotation, which `tsc --strict` rejected.

**Fix:** Imported `type CookieOptions` from `@supabase/ssr` and added an explicit type annotation in all three Supabase client files (`supabaseServer.ts`, `auth/callback/route.ts`, `proxy.ts`):
```typescript
setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
```

**Lesson learned:** Always run `next build` locally before pushing. `next dev` silently ignores type errors that will break CI.

---

### 11. Vercel deployment returned NOT_FOUND on every route

**Symptom:** Deployment succeeded but every URL returned 404 NOT_FOUND.

**Root cause:** During Vercel project setup I set the **Root Directory** field to `src`. But `package.json`, `next.config.ts`, and `tsconfig.json` all live at the repository root. Vercel couldn't find `package.json` inside `src/` and didn't know how to build the project.

**Fix:** Cleared the Root Directory field in **Vercel → Settings → General** (left it empty so Vercel uses the repo root). Redeployed — build succeeded. `src/` is just a source organization convention; it is not the project root.

---

### 12. Google OAuth redirect failing in production

**Symptom:** After deploying, clicking "Sign in with Google" redirected through Google correctly but returned an error from Supabase instead of logging in.

**Root cause:** The Supabase Auth URL Configuration still had:
- **Site URL**: `http://localhost:3000` (local dev value, never updated)
- **Redirect URLs**: `https://my-app.vercel.app/login` (wrong path — OAuth callback lands at `/auth/callback`, not `/login`)

Supabase rejects redirects to URLs not in the explicit allow list.

**Fix:** Updated Supabase **Authentication → URL Configuration**:
- **Site URL** → `https://smart-bookmarkapp-wheat.vercel.app`
- **Redirect URLs** → `https://smart-bookmarkapp-wheat.vercel.app/auth/callback` and `http://localhost:3000/auth/callback`

The second entry keeps local development working. The critical detail: the redirect URL must end in `/auth/callback`, not `/login`.

---

### 13. Google avatar images returning 403 in some browsers

**Symptom:** Profile photos from `lh3.googleusercontent.com` loaded in some browsers but returned 403 Forbidden in others.

**Root cause:** Google's image CDN blocks requests that include a `Referer` header pointing to an external domain. Some browsers send the referer by default on cross-origin image loads.

**Fix:** Added `referrerPolicy="no-referrer"` to the avatar `<img>` tag. This tells the browser to omit the `Referer` header when fetching the image, which Google's CDN allows.

---

## License

MIT
