# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npx expo start            # Start dev server (Metro bundler)
npx expo start --web      # Web only
npx expo start --android  # Android emulator
npx expo start --ios      # iOS simulator

# Build
npm run build             # Export for web (output: dist/)

# Testing
npm test                  # Run jest tests (watch mode)
npx jest --testPathPattern="<file>" # Run a single test file

# Supabase local
npx supabase start        # Start local Supabase stack
npx supabase db push      # Apply migrations to remote
npx supabase functions serve  # Serve Edge Functions locally

# Type checking
npx tsc --noEmit          # Type-check without emitting
```

## Architecture

### App structure (Expo Router file-based routing)

```
app/
  index.tsx               # Splash animation → redirect by role
  _layout.tsx             # Root: GluestackUIProvider > AuthProvider > ThemeProvider
  (auth)/                 # Unauthenticated screens (login, register)
  (client)/               # Client dashboard — protected, redirects if not client
  (admin)/                # Admin dashboard — protected, redirects if not admin
```

Route protection is done in each group's `_layout.tsx` using `useAuth()`. Both layouts check `isLoading → !session → wrong role` and redirect accordingly.

### Authentication & state (`context/AuthContext.tsx`)

`AuthProvider` wraps the entire app and exposes via `useAuth()`:
- `session`, `user` — raw Supabase auth objects
- `role: "client" | "admin" | null` — fetched from `profiles` table after login
- `profile` — full profile row (id, email, full_name, phone_number, role)
- `isLoading` — true until session + profile are resolved
- `onlineUsers: OnlineUser[]` — live presence list via Supabase Realtime channel `"online-users"`

Always read `isLoading` before `role` or `session` to avoid premature redirects.

### Theming

Two-layer theme system:
1. **`constants/theme.ts`** — `appThemePalette` defines semantic color tokens for light/dark. Call `getAppTheme(colorScheme)` to get the palette object. Use `theme.accent`, `theme.canvas`, `theme.textStrong`, etc. for inline styles.
2. **TailwindCSS + NativeWind** — for class-based styling. Color classes come from `tailwind.config.js` custom colors.

Theme mode state is managed in `app/_layout.tsx` (`mode: "system" | "light" | "dark"`). Screens get current scheme via `useColorScheme()` from `nativewind`.

### Path aliases

`@/` maps to the project root (configured in `tsconfig.json` and `babel.config.js`). Always use `@/` for imports, not relative paths crossing group boundaries.

### Supabase

Client singleton at `lib/supabase.ts`. On web it uses cookie/sessionStorage; on native it uses AsyncStorage. Always import from `@/lib/supabase`.

RLS is enforced at database level — clients only see their own rows; admins see all. Any new table must have matching RLS policies. Migrations live in `supabase/migrations/` with timestamp-prefixed filenames.

### Edge Functions (Deno, in `supabase/functions/`)

Three functions handle Midtrans payments:
- `midtrans-token/` — generates a Snap token, called before payment
- `midtrans-webhook/` — receives payment callbacks, updates `payments` table
- `midtrans-check-status/` — polls Midtrans for current transaction status

Called via `lib/edge-functions.ts`. The `MIDTRANS_SERVER_KEY` env var is only available server-side in Edge Functions — never in client code.

### Discussion / chat

Messages support: text content, file attachments (image or file), and context tags (booking, invoice, or package references). Types are in `types/discussion.ts`. Components in `components/discussion/`. Both client and admin layouts include `<DiscussionFAB />` as a floating overlay on all tab screens.

### Database schema summary

| Table | Key fields |
|-------|-----------|
| `profiles` | id (→ auth.users), role, full_name, phone_number |
| `packages` | name, price, original_price, features (JSONB), image_url |
| `bookings` | client_id, package_id, event_date, location, status |
| `invoices` | booking_id, amount, type, status, overtime fields |
| `payments` | booking_id, order_id, snap_token, status |
| `gallery` | url, caption, media_type (image/video) |
| `conversations` | client_id, last_message_at |
| `messages` | conversation_id, sender_id, content, attachment_*, booking_id, invoice_id, package_id, is_read |
