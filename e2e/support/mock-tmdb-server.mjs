import { createServer } from 'node:http'

const portFlag = process.argv.indexOf('--port')
const port = Number(portFlag >= 0 ? process.argv[portFlag + 1] : 4100)

const movies = [
  {
    id: 603,
    title: 'The Matrix',
    original_title: 'The Matrix',
    overview: 'A computer hacker learns that the world around him is not what it seems.',
    poster_path: null,
    backdrop_path: null,
    release_date: '1999-03-31',
    genre_ids: [28, 878],
    adult: false,
    original_language: 'en',
    popularity: 95,
    vote_average: 8.2,
    vote_count: 26000,
    video: false,
  },
  {
    id: 27205,
    title: 'Inception',
    original_title: 'Inception',
    overview: 'A skilled specialist enters dreams to recover closely guarded information.',
    poster_path: null,
    backdrop_path: null,
    release_date: '2010-07-16',
    genre_ids: [28, 878],
    adult: false,
    original_language: 'en',
    popularity: 90,
    vote_average: 8.4,
    vote_count: 36000,
    video: false,
  },
]

const people = [
  {
    id: 6384,
    name: 'Keanu Reeves',
    original_name: 'Keanu Reeves',
    media_type: 'person',
    adult: false,
    gender: 2,
    popularity: 80,
    profile_path: null,
    known_for_department: 'Acting',
    known_for: movies.slice(0, 1),
  },
]

function json(response, value, status = 200) {
  response.writeHead(status, {
    'content-type': 'application/json',
    'cache-control': 'no-store',
  })
  response.end(JSON.stringify(value))
}

function searchResponse(results = movies) {
  return { page: 1, results, total_pages: 1, total_results: results.length }
}

const server = createServer((request, response) => {
  const url = new URL(request.url ?? '/', `http://127.0.0.1:${port}`)
  const path = url.pathname

  if (path === '/health') return json(response, { ok: true })
  if (path === '/3/search/movie') return json(response, searchResponse(movies))
  if (path === '/3/search/multi') {
    return json(response, searchResponse([
      ...movies.map(movie => ({ ...movie, media_type: 'movie' })),
      ...people,
    ]))
  }
  if (path === '/3/trending/movie/week' || path === '/3/movie/popular' ||
      path === '/3/movie/top_rated' || path === '/3/movie/now_playing' ||
      path === '/3/discover/movie') {
    return json(response, searchResponse(movies))
  }
  if (path === '/3/movie/603') {
    return json(response, {
      ...movies[0],
      genres: [{ id: 28, name: 'Action' }, { id: 878, name: 'Science Fiction' }],
      runtime: 136,
      tagline: 'The future is closer than you think.',
      budget: 63_000_000,
      revenue: 463_000_000,
      status: 'Released',
      imdb_id: 'tt0133093',
    })
  }
  if (path === '/3/movie/603/credits') {
    return json(response, {
      id: 603,
      cast: [],
      crew: [{ id: 1, name: 'Lana Wachowski', job: 'Director', department: 'Directing' }],
    })
  }
  if (path === '/3/movie/603/similar') return json(response, searchResponse(movies.slice(1)))
  if (path === '/3/movie/603/keywords') {
    return json(response, { id: 603, keywords: [{ id: 1, name: 'virtual reality' }] })
  }
  if (path === '/3/movie/603/watch/providers') return json(response, { id: 603, results: {} })

  return json(response, { status_message: `No E2E fixture for ${path}` }, 404)
})

server.listen(port, '127.0.0.1')

function shutdown() {
  server.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
