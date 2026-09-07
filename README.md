# NoSpoilers

Movie discovery platform — find films you'll love without spoilers.

**Stack:** Next.js 16 · TypeScript · Tailwind CSS · Prisma · PostgreSQL · NextAuth · TMDb API

---

## Prerequisites

- Node.js 20.9+
- PostgreSQL running locally (or a connection string from Neon, Supabase, Railway, etc.)
- TMDb API key — free at https://www.themoviedb.org/settings/api
- Supabase project for creator movie uploads

---

## Setup

### 1. Clone & install

```bash
cd nospoilers
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `NEXTAUTH_URL` | `http://localhost:3000` for local dev |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` to generate |
| `TMDB_API_KEY` | From your TMDb account settings |
| `TMDB_ACCESS_TOKEN` | Read Access Token from TMDb (preferred over API key) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase public anon key used for direct movie uploads |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key used to issue secure upload tokens |
| `CRON_SECRET` | Separate random secret used to authenticate scheduled cleanup |

Profile pictures are stored in the existing PostgreSQL database. The app creates
the private Supabase `movie-uploads` bucket automatically when a creator starts
their first movie upload; access to video bytes must use signed URLs.

### 3. Set up the database

```bash
# Create a development migration after changing the Prisma schema
npm run db:migrate

# Apply committed migrations in production
npm run db:deploy
```

### 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000

### Chrome extension

The standalone NoSpoilers Shield extension lives in [`extension/`](extension/README.md).
It classifies page content on-device and hides likely spoilers for a user-managed
movie/show list. No NoSpoilers backend or API key is required.

To try it locally, open `chrome://extensions`, enable **Developer mode**, choose
**Load unpacked**, and select the `extension` directory.

---

## Project Structure

```
nospoilers/
├── app/
│   ├── (auth)/            # Login & register pages
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/       # Protected dashboard
│   │   └── dashboard/
│   ├── api/
│   │   ├── auth/          # NextAuth + register endpoint
│   │   └── movies/        # Movie search & detail endpoints
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx           # Landing page
├── components/
│   ├── ui/                # Button, Input, MovieCard
│   ├── landing/           # Navbar, Hero, SearchBar, FeaturedMovies
│   ├── dashboard/         # WelcomeSection, FavoriteMovies, MovieDNA
│   └── providers/         # SessionProvider
├── lib/
│   ├── auth.ts            # NextAuth config
│   ├── db.ts              # Prisma client singleton
│   └── utils.ts           # Helpers (cn, tmdbImageUrl, etc.)
├── services/
│   └── tmdb.ts            # TMDb API service layer
├── types/
│   └── index.ts           # Shared TypeScript types
├── prisma/
│   └── schema.prisma      # Database schema
└── middleware.ts           # Route protection
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server at localhost:3000 |
| `npm run build` | Production build |
| `npm run lint` | Run the Next.js and TypeScript ESLint rules |
| `npm run typecheck` | Check TypeScript without emitting files |
| `npm run check` | Run lint, typecheck, unit tests, and a production build |
| `npm run start` | Start production server |
| `npm run db:push` | Sync Prisma schema to database (no migration file) |
| `npm run db:migrate` | Create & run a migration |
| `npm run db:deploy` | Apply committed migrations without creating new ones |
| `npm run db:studio` | Open Prisma Studio at localhost:5555 |
| `npm run db:generate` | Regenerate Prisma client after schema changes |
| `npm run test:e2e` | Run hermetic Playwright journeys in desktop and mobile Chromium |
| `npm run test:e2e:ui` | Open Playwright's interactive test runner |
| `npm run test:extension` | Run the extension classifier and manifest tests |
| `npm run test:unit` | Run all application and extension unit tests |
| `npm run package:extension` | Validate and package the Chrome Web Store upload ZIP |

---

## API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/movies/search?q=query` | Search TMDb movies |
| `GET` | `/api/movies/search` | Trending movies (no query) |
| `GET` | `/api/movies/[id]` | Movie detail by TMDb ID |
| `POST` | `/api/auth/register` | Create new user |
| `POST` | `/api/auth/[...nextauth]` | NextAuth sign in/out |

### End-to-end tests

Install Chromium once with `npx playwright install chromium`, then run
`npm run test:e2e`. The suite starts NoSpoilers and a local TMDb fixture server,
so it does not need a real TMDb key or database. Set `E2E_BASE_URL` to run the
same journeys against an already-running environment instead.

### NoSpoilers Theater

Open `/theater` to spawn in the first-person multiplex lobby. Use arrow keys or
WASD to walk, drag to look around, and press **E** or **Enter theater** at a door.
The on-screen direction buttons support touch devices. Eight rooms are available;
empty rooms can be explored without signing in, and Showtimes provides direct
access to premieres. `/theater/preview` opens an empty screening room.

Approved Pro preview accounts can schedule a completed Creator Studio upload at
`/theater/new`. The form checks browser playback and reads its runtime, accepts a
film or trailer, and stores the scheduled time in UTC. Optional promotions appear
in the lobby Showtimes panel; these are included preview placements, not external
paid ad campaigns. Creator access and upload ownership are checked on the server.

Apply the `20260906000000_nospoilers_theater` migration with `npm run db:deploy`
before enabling premieres. Theater uses the existing private Supabase upload
bucket and server-only signed URLs. A viewer only receives a stream URL after
reserving a seat and while the scheduled premiere is live. All viewers synchronize
to the server's start time, including late arrivals. Rooms poll every five seconds
and show the saved Pro avatar of each present attendee; reservations survive
reconnects, and presence expires after 45 seconds away.

Creators get a 3D room overview and aggregate ratings. After playback, attendees
must submit a 1–5 star rating to finish the screening or join another premiere.
The requirement is persisted in the database and survives reloads; it does not
prevent closing the browser. The experience supports desktop and touch navigation,
fullscreen, and a flat video fallback, but does not implement WebXR headset mode.

Theater policy tests are included in `npm run test:unit`. Run the browser journeys
with `npm run test:e2e -- e2e/theater.spec.ts`.

---

## TMDb Note

If you have a **Read Access Token** (Bearer token), set `TMDB_ACCESS_TOKEN`.
If you only have an **API key**, set `TMDB_API_KEY` — the service layer handles both automatically.
