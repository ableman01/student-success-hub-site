# Production setup

This is a Vite single-page app. Connect its GitHub repository to Cloudflare Pages for automatic builds and deploys. The app uses Supabase for accounts, assignments, uploaded resources, and study rooms.

## 1. Connect the project to GitHub

Create a private GitHub repository and make this project folder the repository root. Keep `.env.local`, `node_modules/`, and `dist/` out of Git; they are already ignored. Commit and push the source to a `main` branch. Do not commit credentials.

GitHub Actions will run lint, TypeScript checking, and a production build for pull requests and pushes to `main`.

## 2. Connect GitHub to Cloudflare Pages

In Cloudflare, create a **Pages project** connected to the GitHub repository. Configure:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |

Add these build environment variables under the Pages project settings for production and preview deployments:

| Variable | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key (or anon key) |

Cloudflare will provide a `*.pages.dev` address after the first successful build. To use your own domain, add it under the Pages project's **Custom domains** and complete the DNS steps Cloudflare shows. Set the address as HTTPS.

## 3. Set up Supabase Auth for the live site

The current live site is `https://student-success-hub-site.pages.dev`. In Supabase **Authentication → URL Configuration**, set the Site URL to that address and add this exact URL to Redirect URLs:

```text
https://student-success-hub-site.pages.dev/auth/confirm?confirmed=1
```

Add preview URLs separately if you want email links from preview builds to work. The app builds confirmation links from the current site origin, and Supabase only accepts redirect URLs on its allow-list. Keep service-role keys and database passwords out of all `VITE_` variables.

For a first-time setup, run [`supabase/schema.sql`](./supabase/schema.sql) in the SQL Editor of the same Supabase project to set up the app's tables, storage policies, and realtime study-room messages. Incremental database changes are recorded under [`supabase/migrations`](./supabase/migrations). If this project already has a live schema, inspect and synchronize its migration history before enabling automatic schema migrations.

If using a custom SMTP sender, configure and verify it in Supabase Auth. Store SMTP credentials in Supabase settings, never in this repository or browser environment variables.

## 4. Release flow

- Opening a pull request runs lint, type checking, and a build in GitHub Actions.
- Pushing to `main` repeats those checks. Cloudflare Pages builds and deploys the connected repository automatically.
- Database schema changes need a reviewed Supabase migration. The existing project schema should be synchronized before enabling automatic migration deploys.

## If the live link does not work

The current live URL returns the HTML page for its compiled JavaScript and CSS asset URLs. Those URLs should return JavaScript and CSS content. In Cloudflare Pages, check that the build completed from the app's repository root with `npm run build` and that the output directory is `dist`, then redeploy.

After the assets load, check the GitHub Actions run and Cloudflare Pages build log. Confirm the two Supabase build variables are set for production, the Supabase Auth redirect URL matches the live address, and the schema was installed in the Supabase project used by the deployed app.
