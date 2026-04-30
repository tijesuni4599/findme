# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `pnpm dev` — Next.js dev server (Turbopack)
- `pnpm build` — production build (also runs TypeScript — use this to verify changes)
- `pnpm start` — serve the production build

Use `pnpm` for all installs — `pnpm-lock.yaml` is the source of truth. No test framework and no lint script are configured; `pnpm build` is the primary verification step.

### Database

Schema lives in `supabase/migrations/`. Apply with `supabase db push` or paste SQL into the Supabase SQL editor. After schema changes, regenerate types:

```bash
supabase gen types typescript --project-id <id> > lib/supabase/types.ts
```

## Product

**findme** is a link-in-bio product for Nigerian creators. Brand constants live in `lib/constants.ts` (`APP_NAME`, `APP_DOMAIN`). The font is **Space Mono** (Google Fonts, weights 400 and 700 only — there are no others). The `<Logo />` component (`components/logo.tsx`) renders a map-pin SVG mark + wordmark using `currentColor`; use the `iconOnly` prop for compact contexts.

Main surfaces:
- `app/[username]/` — public profile page (unauthenticated)
- `app/(dashboard)/` — authenticated dashboard
- `app/(dashboard)/dashboard/more/` — mobile-only "More" page (Domain, Billing, Settings, Sign out)
- `app/(auth)/` — login and signup
- `app/api/track/` — click + pageview analytics ingest
- `app/api/webhooks/paystack/` — billing webhook

## Stack

Next.js 16.2 App Router · React 19 · TypeScript strict · Tailwind CSS 4 · shadcn/ui (`base-nova`, neutral palette, components in `components/ui/`) · Supabase Postgres + Auth · Paystack · Resend · Cloudflare R2 · Vercel

## Next.js 16 specifics

- The session middleware file is **`proxy.ts`** (not `middleware.ts`) — Next 16 renamed it.
- `proxy.ts` is **UX-only**. It refreshes cookies and soft-redirects. It is not the auth boundary.
- The authoritative auth check is `requireUser()` in `lib/supabase/require-user.ts`. Every protected layout and page must call it.
- Cache Components are intentionally disabled in `next.config.ts`. Do not enable `cacheComponents` without wrapping per-user reads in `<Suspense>`.
- Async params pattern is already in use — follow it:
  ```ts
  type Props = { params: Promise<{ username: string }> };
  ```
- When uncertain about a Next.js 16 API, read `node_modules/next/dist/docs/`.

## Supabase client topology

Three clients; use the right one in the right place:

| Client | Where |
|---|---|
| `lib/supabase/browser.ts` | Client components only |
| `lib/supabase/server.ts::createClient()` | Server Components, Server Actions, Route Handlers |
| `lib/supabase/server.ts::createServiceRoleClient()` | Trusted server-only work that must bypass RLS (`/api/track/*`, `/api/webhooks/paystack`, future cron jobs) |

Never import `createServiceRoleClient` from a component. In `lib/supabase/middleware.ts::updateSession`, do not insert any logic between `createServerClient()` and `supabase.auth.getUser()` — that call triggers the token refresh and cookie write.

## Auth flow

1. Auth forms → Supabase Auth
2. DB trigger `handle_new_user()` auto-creates a `profiles` row with a derived username
3. `/auth/callback` exchanges the code for a session
4. `proxy.ts` refreshes session cookies on every dashboard request
5. `requireUser()` in `app/(dashboard)/layout.tsx` enforces the gate

## Dashboard layout

The layout is a fixed header + fixed sidebar (desktop) + fixed bottom nav (mobile) — content scrolls beneath all three:

- **Header**: `fixed inset-x-0 top-0 z-50 h-14`, padding `px-4 md:px-8`
- **Sidebar**: `fixed top-14 bottom-0 left-0 w-60` — `md:flex`, hidden on mobile
- **Mobile bottom nav**: `fixed bottom-0 inset-x-0 h-16` — `md:hidden`, defined in `app/(dashboard)/_components/mobile-nav.tsx`. Tabs: Links, Analytics, Appearance, More. "More" tab is active for `/dashboard/domain`, `/dashboard/billing`, `/dashboard/settings`, and `/dashboard/more`.
- **Content offset**: `pt-14 md:pl-60`, inner padding `px-4 py-6 pb-24 md:px-8 md:pb-6` (`pb-24` on mobile clears the bottom nav)
- **Sticky panels** inside content (e.g. phone preview): `lg:sticky lg:top-[calc(3.5rem+1.5rem)]` — header height (3.5rem) + content top padding (1.5rem)

## Appearance system

`profiles.theme` stores `{ background: string; foreground: string }` as JSONB.

- The canonical colour palette (`PASTEL_THEMES`) lives in `app/(dashboard)/dashboard/appearance/appearance-editor.tsx`. It ships 16 presets: White, Black, and 14 pastels. Every preset includes a pre-computed `foreground` that meets WCAG AA contrast against its `background`. Do not add a colour without a paired foreground.
- `updateTheme` server action (`app/(dashboard)/dashboard/appearance/actions.ts`) saves to `profiles.theme` and calls `revalidatePath` for both `/dashboard/appearance` and the user's public `/:username` route.
- The public profile page (`app/[username]/page.tsx`) reads `theme.background` and `theme.foreground` via inline styles. The link cards use `rgba(255,255,255,0.8)` / `rgba(0,0,0,0.08)` border so they work on any background.

## Shared phone preview

`app/(dashboard)/_components/profile-phone-preview.tsx` exports `<ProfilePhonePreview>` — the single component used by both the Links and Appearance pages. It takes `profile`, `links: { id, title }[]`, and `theme: { background, foreground }`. The card wrapper and sticky positioning are the responsibility of each page's layout. Do not duplicate the phone-frame markup.

## Links workspace

`app/(dashboard)/dashboard/links/links-workspace.tsx` is a `"use client"` component that:
- Holds optimistic local state for link ordering, enabled/disabled state, and edits
- Implements HTML drag-and-drop (`onDragStart` / `onDrop`) for reordering
- Calls server actions (`actions.ts` in the same directory) for all mutations
- Passes `enabledLinks.map(l => ({ id, title }))` and the `theme` (fetched by the page server component) to `<ProfilePhonePreview>`

The `theme` prop on `<LinksWorkspace>` is static — it reflects the last-saved theme from the DB. Changing the theme is done on the Appearance page, not here.

## Server actions pattern

Each dashboard route that mutates data has a co-located `actions.ts`:
- Marked `"use server"` at the top
- Returns `{ error?: string }` — never throws to the client
- Calls `requireUser()` first
- Calls `revalidatePath(...)` on success

## RLS model

RLS is ON for every table:

- `profiles` — publicly readable; owner-write only
- `links` — publicly readable when `is_enabled = true` and within any scheduled window; owners see all their own links
- `custom_domains`, `subscriptions`, `link_click_events` — owner-read only; writes to `subscriptions` and `link_click_events` must go through `createServiceRoleClient()`

## Analytics ingest

`/api/track/click` and `/api/track/view` receive `navigator.sendBeacon` pings from the public profile page. They return `{ ok: true }` immediately, then defer work with `after(...)` from `next/server`: bot filtering (`isLikelyBot`), device/referrer parsing (`lib/analytics.ts`), a stub `recordEvent` call (future ClickHouse hook), Supabase `link_click_events` insert via service-role client, and `increment_link_click_count` RPC for click events. When ClickHouse is wired, remove the Supabase fallback — don't double-write.

## Reserved usernames

`lib/validations.ts` holds `RESERVED_USERNAMES`. Every top-level route segment under `app/` that could collide with a public username must be in this set. Add to both simultaneously.

## Known incomplete areas

- Profile editing (display name, bio, avatar upload to Cloudflare R2)
- Paystack checkout and subscription management
- Custom domain verification
- ClickHouse analytics (currently stubbed; Supabase is the fallback)
- Legal pages
