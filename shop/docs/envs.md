# Environment Variables

Define environment variables in Vercel dashboard per environment. Common:
- NEXT_PUBLIC_BASE_URL
- MONGODB_URI (production), or skip for preview/local (mock APIs use in-memory)
- NEXTAUTH_SECRET, OVERRIDE_SECRET

Migrations:
- MIGRATIONS_MODE: `validate`/`safe` in preview; `apply` only after approval on production.

Arabic/RTL: Ensure `defaultLocale` is `ar` and UI RTL where applicable.

PWA: Service Worker `public/sw.js` cache updates on new deploys; offline.html served when offline.
