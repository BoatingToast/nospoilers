# NoSpoilers

Movie discovery platform — find films you'll love without spoilers.

**Stack:** Next.js 15 · TypeScript · Tailwind CSS · Prisma · PostgreSQL · NextAuth · TMDb API

---

## Prerequisites

- Node.js 18+
- PostgreSQL running locally (or a connection string from Neon, Supabase, Railway, etc.)
- TMDb API key — free at https://www.themoviedb.org/settings/api

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

### 3. Set up the database

```bash
# Push schema to your database
npm run db:push

# Or use migrations (recommended for production)
npm run db:migrate
```

### 4. Run locally

```bash
npm run dev
```

Open http://localhost:3000

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
| `npm run start` | Start production server |
| `npm run db:push` | Sync Prisma schema to database (no migration file) |
| `npm run db:migrate` | Create & run a migration |
| `npm run db:studio` | Open Prisma Studio at localhost:5555 |
| `npm run db:generate` | Regenerate Prisma client after schema changes |

---

## API Routes

| Method | Route | Description |
|---|---|---|
| `GET` | `/api/movies/search?q=query` | Search TMDb movies |
| `GET` | `/api/movies/search` | Trending movies (no query) |
| `GET` | `/api/movies/[id]` | Movie detail by TMDb ID |
| `POST` | `/api/auth/register` | Create new user |
| `POST` | `/api/auth/[...nextauth]` | NextAuth sign in/out |

---

## TMDb Note

If you have a **Read Access Token** (Bearer token), set `TMDB_ACCESS_TOKEN`.
If you only have an **API key**, set `TMDB_API_KEY` — the service layer handles both automatically.
