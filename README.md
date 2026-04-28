# ML Hub — Fixed File Placement Guide

Copy each file from this download into your Next.js project exactly as shown below.

## File Structure

```
your-project/
│
├── pages/
│   ├── _app.js                    ← REPLACE (was bare default)
│   ├── _document.js               ← keep yours unchanged
│   ├── index.js                   ← keep yours unchanged
│   ├── auth.js                    ← keep yours unchanged
│   ├── dashboard.js               ← REPLACE (client-side fetch fix)
│   └── articles/
│       ├── [id].js                ← REPLACE (imports SocialBar now)
│       └── new.js                 ← NEW FILE (write article page)
│
├── components/
│   ├── Navbar.js                  ← NEW FILE (notification bell)
│   └── SocialBar.js               ← NEW FILE (was in components/)
│
├── hooks/
│   └── useNotifications.js        ← NEW FILE (move from root)
│
└── lib/
    ├── supabaseClient.js          ← unchanged
    ├── db.js                      ← REPLACE (added createArticle)
    └── share.js                   ← NEW FILE (move from root)
```

## What Was Fixed

### 1. Articles not showing on dashboard
**Cause:** `dashboard.js` used `getServerSideProps` which runs on the server
without your user's auth token, so Supabase RLS blocked the query silently.
**Fix:** Switched to `useEffect` client-side fetch — the browser sends the
auth session automatically.

### 2. SocialBar missing on article page
**Cause:** `article.js` called `<SocialBar />` without importing it.
**Fix:** Added `import SocialBar from '../../components/SocialBar'`.

### 3. _app.js had no auth, Navbar, or notifications
**Cause:** It was the bare Next.js default — just `<Component {...pageProps} />`.
**Fix:** Full auth state listener + `useNotifications` hook + `<Navbar />`.

### 4. Notifications not wired up
**Cause:** `useNotifications` hook existed but was never called.
**Fix:** Called in `_app.js` with the logged-in user's ID.

### 5. No way to write/create articles
**Fix:** Added `pages/articles/new.js` + `createArticle()` in `db.js`.

## Supabase Dashboard Steps (required)

1. Run the SQL schema from the previous guide (if not done already)
2. Go to **Database → Replication** and enable Realtime for:
   - `notifications` table (INSERT)
   - `articles` table (INSERT + UPDATE)
3. Confirm your `.env.local` has both keys set correctly

## .env.local

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```