# Student Success Hub

A student workspace for categorized course materials, past questions with contributor names, assignment planning, and live study rooms.

## Run locally

Requirements: Node.js 22 or later and npm.

```powershell
npm.cmd ci
npm.cmd run dev
```

Open the local URL printed by Vite. For a production build, run `npm.cmd run build`.

The app uses Vue 3, TypeScript, Vite, Vuetify, Vue Router, Pinia, Vue I18n, and Supabase. Its main code is in `src/`:

- `pages/` contains route-level screens.
- `components/` contains shared interface components.
- `router/` defines routes and sign-in requirements.
- `lib/` contains authentication, Supabase setup, and shared utilities.
- `services/` contains data access for assignments, resources, and study rooms.
- `plugins/` configures Vuetify, Pinia, and translations.
- `styles/` contains global styling and theme settings.

## Supabase

Copy `.env.example` to `.env.local` and set the Supabase project URL and publishable key. The browser uses only a publishable/anon key; never add a service-role or database password to a `VITE_` variable.

Run [`supabase/schema.sql`](./supabase/schema.sql) in the SQL Editor of the Supabase project before using assignments, uploads, and live study rooms. The schema installs the tables, storage policies, and realtime setup those features need. Without valid Supabase settings, the app uses a labelled, browser-only demo mode.

## Quality checks

```powershell
npm.cmd run lint
npm.cmd run type-check
npm.cmd run build
```

## Hosting and automated releases

See [`DEPLOYMENT.md`](./DEPLOYMENT.md) to connect GitHub, deploy to Cloudflare Pages, provide production Supabase settings, and allow email confirmation links to return to the live site. GitHub Actions checks pull requests and pushes to `main`.
