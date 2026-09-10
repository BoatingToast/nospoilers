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
| `SITE_URL` | Canonical public origin; defaults to `https://www.nospoilers.xyz` |
| `GOOGLE_SITE_VERIFICATION` | Optional Search Console HTML verification token (the tag's `content` value) |
| `NEXTAUTH_SECRET` | Run `openssl rand -base64 32` to generate |
| `TMDB_API_KEY` | From your TMDb account settings |
| `TMDB_ACCESS_TOKEN` | Read Access Token from TMDb (preferred over API key) |
| `SUPABASE_URL` | Server-side Supabase project URL for movie storage (also accepts the existing `NEXT_PUBLIC_SUPABASE_URL`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only key used to issue secure upload tokens |
| `NEXT_PUBLIC_SUPABASE_URL` | Optional Supabase project URL for realtime Spoiler Zone updates |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Optional public anon key for realtime updates; movie uploads do not require it |
| `CRON_SECRET` | Separate random secret used to authenticate scheduled cleanup |

Profile pictures are stored in the existing PostgreSQL database. The app creates
the private Supabase `movie-uploads` bucket automatically when a creator starts
their first movie upload; access to video bytes must use signed URLs.

For a deployed app, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the
hosting project's environment settings for each environment that should support
uploads, then redeploy. A database connection alone does not provide movie
storage. Keep the service-role key server-only; never prefix it with
`NEXT_PUBLIC_`. The browser uploads directly to the single-file signed URL
returned by the authenticated upload API, so movie bytes do not pass through the
app's request body limit. The API verifies the stored file before marking it ready.

The storage project's file-size limit must support the advertised 1 GB maximum;
the private bucket cannot override a lower project-wide limit. If storage is not
configured, the upload dialog reports unavailability before requesting a file.

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

### NoSpoilers Lab

Open `/lab` while signed in, or choose **NoSpoilers Lab** from the profile menu,
dashboard, or Creator Studio. Lab is a local filmmaking workspace and needs no AI
API, database migration, or additional cloud storage configuration.

- Create projects or try the editable starter film.
- Import browser-decodable MP4, MOV, M4V, WebM, JPG, PNG, WebP, MP3, WAV, M4A,
  AAC, OGG, or FLAC files, up to 1 GB per file. Unsupported codecs report an error.
- Add shots to a sequential picture track; reorder, split, duplicate, and trim
  them using drag handles or precise source times. Set speed, volume, framing,
  color looks, and fades through black.
- Layer manually timed titles, subtitles, credits, music, and voiceover. Audio
  supports source trimming, volume, and fades. Text and audio keep their explicit
  timestamps when picture clips move or change length.
- Preview the composite with sound, seek by frame, and use session undo/redo.
- Export 720p or 1080p at 30 fps in widescreen, portrait, or square format. The
  browser exposes supported MP4/WebM encoders. Preview and export share the same
  canvas compositor, and WebM exports include a finite duration for playback.
- Download the finished movie, then upload it through Creator Studio to use the
  existing publishing and Theater flows.

Projects, original media, and notes autosave to IndexedDB, separated by account
within the current browser. They are **not cloud synced**. Clearing browser site
data removes them. ZIP backups include the original media and edit; portable
backup/restore currently supports up to 500 MB of media. Restore creates a new
project instead of overwriting an existing edit. Undo history lasts for the
current editing session.

This first version targets short films. Export uses browser MediaRecorder and
runs at playback speed; keep the tab visible. Hiding it stops the export with a
retry message. Canceling releases the encoder and media resources. Larger
exports and backup files consume browser memory. Desktop Chromium is the tested
editing/export target; mobile Chromium journeys also exercise the responsive
panels. Native iOS Safari and other codecs may differ. There is one sequential
picture track, independent audio layers, and text layers; cloud collaboration,
AI, keyframe animation, and overlapping picture compositing are not included.

`npm run test:unit` includes timeline, validation, and WebM metadata tests.
Run the browser journeys with `npm run test:e2e -- e2e/lab.spec.ts`. They create
real video/audio fixtures, decode exported output, check picture and sound, test
project persistence/backups, and exercise failure/cancellation paths. If using a
system Chrome installation, set `E2E_CHROME_CHANNEL=chrome`. Use `E2E_PORT` and
`E2E_TMDB_PORT` to avoid existing local servers; test builds are isolated under
`.next-e2e-<port>`. `NOSPOILERS_BUILD_DIR` can also isolate other local builds.

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

## Search indexing and SEO

Public movie and actor pages have individual canonical URLs, descriptions, and
social previews. The homepage identifies NoSpoilers with WebSite and Organization
structured data; movie pages describe only visible film facts and breadcrumbs.
Movie descriptions omit plot summaries and taglines. `/movie-recommendations`
provides a public guide to discovery, Movie DNA, and spoiler controls.

`/sitemap.xml` refreshes hourly and includes the main public pages and a deduplicated
set of movies from the trending, popular, top-rated, and now-playing catalogs.
It remains available if a catalog fails, and excludes accounts, internal search,
and private member tools. `/robots.txt` advertises it. Account and internal search
routes send `X-Robots-Tag: noindex, follow`; crawling stays allowed so search
engines can read that directive. Vercel non-production deployments send noindex
for all routes. Canonicals always use `SITE_URL`, independent of the auth URL.

After deploying:

1. Verify the URL-prefix property `https://www.nospoilers.xyz/` in Google Search
   Console using the included `public/googlec5f614f004ed0fab.html` file. Keep this
   file deployed after verification to retain ownership. Alternatively, verify
   the `nospoilers.xyz` domain property using DNS, or set
   `GOOGLE_SITE_VERIFICATION` to a Search Console HTML tag token before rebuilding.
2. Submit `https://www.nospoilers.xyz/sitemap.xml` in Search Console.
3. Inspect the homepage, `/discover`, `/movie-recommendations`, and a movie URL.
   Check the rendered page and request indexing for those representative pages.
4. Validate the homepage and movie structured data with Google's Rich Results
   Test or Schema.org's validator. Movie facts alone do not guarantee a rich result.
5. Monitor indexed pages, impressions, clicks, and query positions. Start with
   branded queries, spoiler-free movie recommendations, and specific film titles.
   Add useful original guides and earn relevant links over time; technical SEO
   does not guarantee a first-place ranking for broad queries such as “movies.”

Reference: [Google's SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
and [sitemap submission guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

Verification: `npm run test:unit` includes SEO parsing and spoiler-safety checks;
`npm run test:e2e -- e2e/seo.spec.ts --project=desktop-chromium` checks crawler HTML,
canonicals, structured data, sitemap, noindex headers, missing movies, and the
social preview using the local TMDb fixtures.
