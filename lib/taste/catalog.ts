import type { FacetId, FacetVector } from './engine'

/**
 * Catalog metadata -> taste facets.
 *
 * A film's facet values come from two rule tables: genre and keyword. Both are
 * plain data so a reader can see why a film scored the way it did. Keywords
 * that hint at how a story turns out are discarded before anything else sees
 * them, so they can neither shape a recommendation nor appear in its reasons.
 */

export interface CatalogMeta {
  genreIds: number[]
  keywords: string[]
  runtime: number | null
  popularity: number | null
  budget?: number | null
}

type Weights = Partial<FacetVector>

const GENRE_FACETS: Record<number, { name: string; weights: Weights }> = {
  28:    { name: 'Action',      weights: { momentum: 0.9, spectacle: 0.7, tension: 0.2 } },
  12:    { name: 'Adventure',   weights: { spectacle: 0.6, momentum: 0.4, atmosphere: 0.2 } },
  16:    { name: 'Animation',   weights: { atmosphere: 0.4, humor: 0.3 } },
  35:    { name: 'Comedy',      weights: { humor: 1.2 } },
  80:    { name: 'Crime',       weights: { tension: 0.6, intensity: 0.5, grounding: 0.3 } },
  99:    { name: 'Documentary', weights: { grounding: 1.4 } },
  18:    { name: 'Drama',       weights: { relationships: 0.7, grounding: 0.3 } },
  10751: { name: 'Family',      weights: { relationships: 0.5, humor: 0.4 } },
  14:    { name: 'Fantasy',     weights: { atmosphere: 0.7, spectacle: 0.4 } },
  36:    { name: 'History',     weights: { grounding: 0.9 } },
  27:    { name: 'Horror',      weights: { intensity: 1.0, tension: 0.8, atmosphere: 0.4 } },
  10402: { name: 'Music',       weights: { relationships: 0.3, atmosphere: 0.3 } },
  9648:  { name: 'Mystery',     weights: { tension: 0.8, ideas: 0.4 } },
  10749: { name: 'Romance',     weights: { relationships: 1.1 } },
  878:   { name: 'Sci-Fi',      weights: { ideas: 0.8, atmosphere: 0.4, spectacle: 0.3 } },
  53:    { name: 'Thriller',    weights: { tension: 1.0, momentum: 0.3, intensity: 0.2 } },
  10752: { name: 'War',         weights: { intensity: 0.7, grounding: 0.6, spectacle: 0.3 } },
  37:    { name: 'Western',     weights: { atmosphere: 0.6, grounding: 0.3 } },
}

/**
 * `tag` is the descriptor shown as catalog evidence. Entries without one still
 * shape the facet but are never displayed, because even a theme can say too much.
 */
const KEYWORD_FACETS: Record<string, { weights: Weights; tag?: string }> = {
  // Relationships
  'family relationships':         { weights: { relationships: 0.8 }, tag: 'family bonds' },
  'father daughter relationship': { weights: { relationships: 0.8 }, tag: 'family bonds' },
  'father son relationship':      { weights: { relationships: 0.8 }, tag: 'family bonds' },
  'mother daughter relationship': { weights: { relationships: 0.8 }, tag: 'family bonds' },
  'siblings':                     { weights: { relationships: 0.6 }, tag: 'family bonds' },
  'friendship':                   { weights: { relationships: 0.7 }, tag: 'friendship' },
  'love':                         { weights: { relationships: 0.6 }, tag: 'romance' },
  'romance':                      { weights: { relationships: 0.7 }, tag: 'romance' },
  'marriage':                     { weights: { relationships: 0.6 } },
  'coming of age':                { weights: { relationships: 0.6 }, tag: 'coming of age' },
  'character study':              { weights: { relationships: 0.6 }, tag: 'character study' },
  'ensemble cast':                { weights: { relationships: 0.4 }, tag: 'ensemble' },
  'grief':                        { weights: { relationships: 0.6 } },
  'loneliness':                   { weights: { relationships: 0.5, atmosphere: 0.3 } },
  'nostalgia':                    { weights: { relationships: 0.4, atmosphere: 0.3 }, tag: 'nostalgic' },

  // Ideas
  'time travel':                  { weights: { ideas: 0.8 }, tag: 'time travel' },
  'artificial intelligence':      { weights: { ideas: 0.8 }, tag: 'artificial intelligence' },
  'philosophical':                { weights: { ideas: 0.9 }, tag: 'philosophical' },
  'existentialism':               { weights: { ideas: 0.9 }, tag: 'philosophical' },
  'nonlinear narrative':          { weights: { ideas: 0.7 }, tag: 'nonlinear structure' },
  'multiple timelines':           { weights: { ideas: 0.7 }, tag: 'nonlinear structure' },
  'alternate reality':            { weights: { ideas: 0.7, atmosphere: 0.3 }, tag: 'alternate reality' },
  'science':                      { weights: { ideas: 0.7 }, tag: 'hard science' },
  'physics':                      { weights: { ideas: 0.8 }, tag: 'hard science' },
  'mathematics':                  { weights: { ideas: 0.7 }, tag: 'hard science' },
  'linguistics':                  { weights: { ideas: 0.7 }, tag: 'language and communication' },
  'first contact':                { weights: { ideas: 0.7, atmosphere: 0.3 }, tag: 'first contact' },
  'social commentary':            { weights: { ideas: 0.6, grounding: 0.4 }, tag: 'social commentary' },
  'satire':                       { weights: { ideas: 0.4, humor: 0.6 }, tag: 'satire' },
  'surrealism':                   { weights: { ideas: 0.6, atmosphere: 0.7 }, tag: 'surreal' },
  'technology':                   { weights: { ideas: 0.5 }, tag: 'technology' },
  'consciousness':                { weights: { ideas: 0.8 }, tag: 'philosophical' },

  // Atmosphere
  'neo-noir':                     { weights: { atmosphere: 0.9, tension: 0.3 }, tag: 'neo-noir' },
  'dystopia':                     { weights: { atmosphere: 0.7, ideas: 0.4 }, tag: 'dystopian world' },
  'cyberpunk':                    { weights: { atmosphere: 0.9, ideas: 0.3 }, tag: 'cyberpunk' },
  'space':                        { weights: { atmosphere: 0.6, spectacle: 0.4 }, tag: 'space' },
  'post-apocalyptic':             { weights: { atmosphere: 0.7, intensity: 0.3 }, tag: 'post-apocalyptic world' },
  'gothic':                       { weights: { atmosphere: 0.9 }, tag: 'gothic' },
  'slow burn':                    { weights: { atmosphere: 0.7, momentum: -0.7 }, tag: 'slow burn' },
  'period drama':                 { weights: { atmosphere: 0.6, grounding: 0.3 }, tag: 'period setting' },
  'wilderness':                   { weights: { atmosphere: 0.6 }, tag: 'wilderness' },
  'desert':                       { weights: { atmosphere: 0.5 }, tag: 'desert setting' },
  'dreamlike':                    { weights: { atmosphere: 0.8, ideas: 0.3 }, tag: 'dreamlike' },
  'visually striking':            { weights: { atmosphere: 0.8, spectacle: 0.3 }, tag: 'visually striking' },
  'isolation':                    { weights: { atmosphere: 0.6, tension: 0.3 }, tag: 'isolated setting' },
  'world building':               { weights: { atmosphere: 0.8, spectacle: 0.3 }, tag: 'world-building' },
  'meditative':                   { weights: { atmosphere: 0.7, momentum: -0.6 }, tag: 'meditative' },

  // Momentum
  'chase':                        { weights: { momentum: 0.8, tension: 0.3 }, tag: 'chases' },
  'car chase':                    { weights: { momentum: 0.9, spectacle: 0.4 }, tag: 'chases' },
  'heist':                        { weights: { momentum: 0.6, tension: 0.6 }, tag: 'heist' },
  'race against time':            { weights: { momentum: 0.8, tension: 0.5 }, tag: 'race against time' },
  'fast paced':                   { weights: { momentum: 1.0 }, tag: 'fast-paced' },
  'martial arts':                 { weights: { momentum: 0.8, spectacle: 0.5 }, tag: 'martial arts' },
  'road trip':                    { weights: { momentum: 0.3, relationships: 0.4 }, tag: 'road trip' },
  'dialogue driven':              { weights: { momentum: -0.5, relationships: 0.5 }, tag: 'dialogue-driven' },

  // Tension
  'conspiracy':                   { weights: { tension: 0.8, ideas: 0.3 }, tag: 'conspiracy' },
  'investigation':                { weights: { tension: 0.7, grounding: 0.2 }, tag: 'investigation' },
  'detective':                    { weights: { tension: 0.7 }, tag: 'detective story' },
  'whodunit':                     { weights: { tension: 0.8, humor: 0.1 }, tag: 'whodunit' },
  'paranoia':                     { weights: { tension: 0.8, atmosphere: 0.3 }, tag: 'paranoia' },
  'spy':                          { weights: { tension: 0.7, momentum: 0.4 }, tag: 'espionage' },
  'hostage':                      { weights: { tension: 0.9, intensity: 0.3 } },
  'kidnapping':                   { weights: { tension: 0.8, intensity: 0.4 } },
  'survival':                     { weights: { tension: 0.8, intensity: 0.3 }, tag: 'survival' },
  'psychological thriller':       { weights: { tension: 0.9, ideas: 0.3 }, tag: 'psychological thriller' },
  'cat and mouse':                { weights: { tension: 0.9 }, tag: 'cat and mouse' },

  // Dark intensity
  'violence':                     { weights: { intensity: 0.9 }, tag: 'violent' },
  'gore':                         { weights: { intensity: 1.1 }, tag: 'graphic' },
  'brutality':                    { weights: { intensity: 1.0 }, tag: 'brutal' },
  'serial killer':                { weights: { intensity: 0.9, tension: 0.6 } },
  'murder':                       { weights: { intensity: 0.6, tension: 0.4 } },
  'torture':                      { weights: { intensity: 1.1 } },
  'revenge':                      { weights: { intensity: 0.6, momentum: 0.3 }, tag: 'revenge story' },
  'war':                          { weights: { intensity: 0.6, grounding: 0.4 }, tag: 'war' },
  'bleak':                        { weights: { intensity: 0.8, atmosphere: 0.3 }, tag: 'bleak' },
  'disturbing':                   { weights: { intensity: 1.0 }, tag: 'disturbing' },
  'body horror':                  { weights: { intensity: 1.1, atmosphere: 0.3 }, tag: 'body horror' },
  'addiction':                    { weights: { intensity: 0.5, grounding: 0.5 } },

  // Humor
  'dark comedy':                  { weights: { humor: 0.7, intensity: 0.3 }, tag: 'dark comedy' },
  'black comedy':                 { weights: { humor: 0.7, intensity: 0.3 }, tag: 'dark comedy' },
  'parody':                       { weights: { humor: 0.9 }, tag: 'parody' },
  'slapstick comedy':             { weights: { humor: 1.0 }, tag: 'slapstick' },
  'buddy comedy':                 { weights: { humor: 0.8, relationships: 0.4 }, tag: 'buddy comedy' },
  'whimsical':                    { weights: { humor: 0.6, atmosphere: 0.5 }, tag: 'whimsical' },
  'feel good':                    { weights: { humor: 0.6, relationships: 0.3, intensity: -0.6 }, tag: 'feel-good' },
  'witty':                        { weights: { humor: 0.7 }, tag: 'witty' },

  // Grounding
  'based on true story':          { weights: { grounding: 1.1 }, tag: 'based on a true story' },
  'based on a true story':        { weights: { grounding: 1.1 }, tag: 'based on a true story' },
  'biography':                    { weights: { grounding: 0.9 }, tag: 'biographical' },
  'journalism':                   { weights: { grounding: 0.8, tension: 0.2 }, tag: 'journalism' },
  'working class':                { weights: { grounding: 0.8 }, tag: 'working-class setting' },
  'politics':                     { weights: { grounding: 0.6, ideas: 0.3 }, tag: 'political' },
  'slice of life':                { weights: { grounding: 0.8, relationships: 0.4, momentum: -0.4 }, tag: 'slice of life' },
  'naturalistic':                 { weights: { grounding: 0.9 }, tag: 'naturalistic' },
  'procedural':                   { weights: { grounding: 0.7, tension: 0.3 }, tag: 'procedural' },
  'finance':                      { weights: { grounding: 0.6, ideas: 0.3 }, tag: 'finance' },
  'sports':                       { weights: { grounding: 0.4, momentum: 0.4 }, tag: 'sports' },

  // Spectacle
  'superhero':                    { weights: { spectacle: 0.9, momentum: 0.4 }, tag: 'superhero' },
  'space opera':                  { weights: { spectacle: 0.9, atmosphere: 0.4 }, tag: 'space opera' },
  'battle':                       { weights: { spectacle: 0.8, intensity: 0.3 }, tag: 'large-scale battles' },
  'epic':                         { weights: { spectacle: 0.9, momentum: -0.2 }, tag: 'epic scale' },
  'monster':                      { weights: { spectacle: 0.7, tension: 0.3 }, tag: 'creature feature' },
  'practical effects':            { weights: { spectacle: 0.7 }, tag: 'practical effects' },
  'aerial combat':                { weights: { spectacle: 0.9, momentum: 0.5 }, tag: 'aerial action' },
  'blockbuster':                  { weights: { spectacle: 0.6 }, tag: 'blockbuster scale' },
  'imax':                         { weights: { spectacle: 0.6 }, tag: 'large-format spectacle' },
  'minimalist':                   { weights: { spectacle: -0.6, grounding: 0.3 }, tag: 'minimalist' },
  'low budget':                   { weights: { spectacle: -0.6 }, tag: 'small scale' },
  'chamber piece':                { weights: { spectacle: -0.7, relationships: 0.3, tension: 0.3 }, tag: 'chamber piece' },

  // TMDb's own spellings and mood keywords for the same ideas
  'family':                       { weights: { relationships: 0.6 }, tag: 'family bonds' },
  'sibling relationship':         { weights: { relationships: 0.7 }, tag: 'family bonds' },
  'sister sister relationship':   { weights: { relationships: 0.7 }, tag: 'family bonds' },
  'brother brother relationship': { weights: { relationships: 0.7 }, tag: 'family bonds' },
  'mother son relationship':      { weights: { relationships: 0.8 }, tag: 'family bonds' },
  'parent child relationship':    { weights: { relationships: 0.8 }, tag: 'family bonds' },
  'single father':                { weights: { relationships: 0.5 } },
  'childhood friends':            { weights: { relationships: 0.6 }, tag: 'friendship' },
  'best friend':                  { weights: { relationships: 0.6 }, tag: 'friendship' },
  'heartbreak':                   { weights: { relationships: 0.5 } },
  'loss':                         { weights: { relationships: 0.4 } },
  'intimate':                     { weights: { relationships: 0.6, spectacle: -0.3 }, tag: 'intimate' },
  'wistful':                      { weights: { relationships: 0.3, atmosphere: 0.4 }, tag: 'wistful' },
  'semi autobiographical':        { weights: { relationships: 0.3, grounding: 0.4 } },

  'artificial intelligence (a.i.)': { weights: { ideas: 0.8 }, tag: 'artificial intelligence' },
  'quantum mechanics':            { weights: { ideas: 0.8 }, tag: 'hard science' },
  'scientist':                    { weights: { ideas: 0.4 } },
  'time warp':                    { weights: { ideas: 0.6 }, tag: 'time travel' },
  'time-manipulation':            { weights: { ideas: 0.6 } },
  'time paradox':                 { weights: { ideas: 0.8 } },
  'alternate timeline':           { weights: { ideas: 0.6 } },
  'nonlinear timeline':           { weights: { ideas: 0.7 }, tag: 'nonlinear structure' },
  'philosophy':                   { weights: { ideas: 0.9 }, tag: 'philosophical' },
  'determinism':                  { weights: { ideas: 0.7 }, tag: 'philosophical' },
  'transhumanism':                { weights: { ideas: 0.7 }, tag: 'philosophical' },
  'speculative':                  { weights: { ideas: 0.6 }, tag: 'speculative' },
  'complex':                      { weights: { ideas: 0.6 }, tag: 'intricate' },
  'language':                     { weights: { ideas: 0.5 }, tag: 'language and communication' },
  'communication':                { weights: { ideas: 0.4 } },
  'alien contact':                { weights: { ideas: 0.6, atmosphere: 0.3 }, tag: 'first contact' },
  'man vs machine':               { weights: { ideas: 0.5, tension: 0.3 } },
  'class differences':            { weights: { ideas: 0.5, grounding: 0.4 }, tag: 'social commentary' },
  'provocative':                  { weights: { ideas: 0.5 }, tag: 'provocative' },

  'tech noir':                    { weights: { atmosphere: 0.9, ideas: 0.3 }, tag: 'tech noir' },
  'film noir':                    { weights: { atmosphere: 0.9, tension: 0.3 }, tag: 'noir' },
  'urban gothic':                 { weights: { atmosphere: 0.8, intensity: 0.3 }, tag: 'gothic' },
  'future':                       { weights: { atmosphere: 0.4, ideas: 0.3 } },
  'near future':                  { weights: { atmosphere: 0.4, ideas: 0.3 }, tag: 'near-future setting' },
  'dark future':                  { weights: { atmosphere: 0.6, intensity: 0.3 }, tag: 'dystopian world' },
  'post-apocalyptic future':      { weights: { atmosphere: 0.7, intensity: 0.3 }, tag: 'post-apocalyptic world' },
  'desert wasteland':             { weights: { atmosphere: 0.6 }, tag: 'desert setting' },
  'spacecraft':                   { weights: { atmosphere: 0.3, spectacle: 0.4 }, tag: 'space' },
  'space travel':                 { weights: { atmosphere: 0.4, spectacle: 0.4 }, tag: 'space' },
  'astronaut':                    { weights: { atmosphere: 0.3, spectacle: 0.2 }, tag: 'space' },
  'android':                      { weights: { ideas: 0.5, atmosphere: 0.3 }, tag: 'artificial intelligence' },
  'robot':                        { weights: { ideas: 0.3, spectacle: 0.3 } },
  'serene':                       { weights: { atmosphere: 0.6, momentum: -0.5 }, tag: 'meditative' },
  'dreary':                       { weights: { atmosphere: 0.4, intensity: 0.2 } },
  'magic':                        { weights: { atmosphere: 0.6, spectacle: 0.3 }, tag: 'magic' },
  'fairy tale':                   { weights: { atmosphere: 0.7 }, tag: 'fairy tale' },

  'high-speed chase':             { weights: { momentum: 0.9, spectacle: 0.4 }, tag: 'chases' },
  'on the run':                   { weights: { momentum: 0.6, tension: 0.4 }, tag: 'on the run' },
  'shootout':                     { weights: { momentum: 0.5, intensity: 0.4 } },
  'explosion':                    { weights: { spectacle: 0.6, momentum: 0.4 } },
  'hand to hand combat':          { weights: { momentum: 0.6, spectacle: 0.3 }, tag: 'martial arts' },

  'espionage':                    { weights: { tension: 0.7, momentum: 0.3 }, tag: 'espionage' },
  'assassin':                     { weights: { tension: 0.5, momentum: 0.4, intensity: 0.3 } },
  'murder mystery':               { weights: { tension: 0.8 }, tag: 'murder mystery' },
  'police':                       { weights: { tension: 0.4, grounding: 0.3 } },
  'surveillance':                 { weights: { tension: 0.5, ideas: 0.2 } },
  'terrorism':                    { weights: { tension: 0.6, intensity: 0.4 } },
  'psychological horror':         { weights: { tension: 0.8, intensity: 0.6 }, tag: 'psychological horror' },
  'supernatural':                 { weights: { tension: 0.4, atmosphere: 0.5 }, tag: 'supernatural' },

  'intense':                      { weights: { intensity: 0.5, tension: 0.4 }, tag: 'intense' },
  'sadism':                       { weights: { intensity: 1.0 } },
  'psychopath':                   { weights: { intensity: 0.8, tension: 0.4 } },
  'grimdark':                     { weights: { intensity: 0.9, atmosphere: 0.3 }, tag: 'bleak' },
  'slasher':                      { weights: { intensity: 1.0, tension: 0.4 }, tag: 'slasher' },
  'zombie':                       { weights: { intensity: 0.7, tension: 0.4 }, tag: 'zombies' },
  'gangster':                     { weights: { intensity: 0.6, grounding: 0.3 }, tag: 'gangster story' },
  'mafia':                        { weights: { intensity: 0.6, grounding: 0.3 }, tag: 'gangster story' },
  'world war ii':                 { weights: { intensity: 0.5, grounding: 0.6 }, tag: 'war' },
  'hopeful':                      { weights: { intensity: -0.5, relationships: 0.2 }, tag: 'hopeful' },
  'comforting':                   { weights: { intensity: -0.6, humor: 0.3 }, tag: 'feel-good' },

  'absurd':                       { weights: { humor: 0.6, ideas: 0.3 }, tag: 'absurdist' },
  'mockumentary':                 { weights: { humor: 0.7, grounding: 0.2 }, tag: 'mockumentary' },
  'buddy':                        { weights: { humor: 0.5, relationships: 0.4 }, tag: 'buddy comedy' },

  'based on memoir or autobiography': { weights: { grounding: 0.9 }, tag: 'biographical' },
  'historical figure':            { weights: { grounding: 0.8 }, tag: 'biographical' },
  'true crime':                   { weights: { grounding: 0.8, intensity: 0.4 }, tag: 'true crime' },
  'independent film':             { weights: { grounding: 0.4, spectacle: -0.4 }, tag: 'small scale' },
  'small town':                   { weights: { grounding: 0.5 }, tag: 'small-town setting' },
  'immigrant':                    { weights: { grounding: 0.5, relationships: 0.3 } },
  'racism':                       { weights: { grounding: 0.6, ideas: 0.3 } },
  'poverty':                      { weights: { grounding: 0.7 } },

  'space adventure':              { weights: { spectacle: 0.7, atmosphere: 0.3 }, tag: 'space' },
  'kaiju':                        { weights: { spectacle: 0.9 }, tag: 'creature feature' },
  'giant monster':                { weights: { spectacle: 0.9 }, tag: 'creature feature' },
  'dinosaur':                     { weights: { spectacle: 0.8 }, tag: 'creature feature' },
  'disaster':                     { weights: { spectacle: 0.7, tension: 0.4 }, tag: 'disaster' },
  'sword fight':                  { weights: { spectacle: 0.5, momentum: 0.4 } },
  'audacious':                    { weights: { spectacle: 0.4 }, tag: 'audacious' },
}

/**
 * Catalog keywords that give away how a story unfolds. Matching keywords are
 * dropped entirely. Knowing a film has a twist is itself a spoiler.
 */
const REVEALING_KEYWORD = /twist|ending|surprise|reveal|dies|\bdeath\b|dead|killer is|secret identity|unreliable narrator|betray|treason|deception|sacrifice|suicide|afterlife|resurrection|identity swap|double cross|impostor|imposter|it was all|dream sequence|credits|stinger|cameo|villain turns|turns good|back from the dead/i

export function isRevealingKeyword(keyword: string): boolean {
  return REVEALING_KEYWORD.test(keyword)
}

function emptyVector(): FacetVector {
  return {
    relationships: 0, ideas: 0, atmosphere: 0, momentum: 0, tension: 0,
    intensity: 0, humor: 0, grounding: 0, spectacle: 0,
  }
}

export function genreName(genreId: number): string | null {
  return GENRE_FACETS[genreId]?.name ?? null
}

/** Saturating squash so several weak signals cannot exceed one defining one. */
function squash(total: number): number {
  return total <= 0 ? 0 : Math.round((1 - Math.exp(-total / 1.3)) * 1000) / 1000
}

export function deriveFacets(meta: CatalogMeta): {
  facets: FacetVector
  tags: Partial<Record<FacetId, string[]>>
} {
  const totals = emptyVector()
  const tags: Partial<Record<FacetId, string[]>> = {}

  function addTag(facet: FacetId, tag: string) {
    const list = tags[facet] ?? (tags[facet] = [])
    if (!list.includes(tag)) list.push(tag)
  }

  function apply(weights: Weights, tag: string | undefined) {
    let strongest: FacetId | null = null
    for (const [facet, weight] of Object.entries(weights) as Array<[FacetId, number]>) {
      totals[facet] += weight
      if (weight > 0 && (strongest === null || weight > (weights[strongest] ?? 0))) strongest = facet
    }
    // A descriptor is evidence only for the facet it most strongly indicates.
    if (tag && strongest) addTag(strongest, tag)
  }

  for (const genreId of new Set(meta.genreIds)) {
    const rule = GENRE_FACETS[genreId]
    if (rule) apply(rule.weights, rule.name)
  }

  for (const raw of new Set(meta.keywords.map(keyword => keyword.toLowerCase().trim()))) {
    if (isRevealingKeyword(raw)) continue
    const rule = KEYWORD_FACETS[raw]
    if (rule) apply(rule.weights, rule.tag)
  }

  if (meta.runtime !== null) {
    if (meta.runtime <= 100) totals.momentum += 0.3
    else if (meta.runtime >= 150) totals.momentum -= 0.35
  }
  if ((meta.budget ?? 0) >= 150_000_000) totals.spectacle += 0.5
  else if ((meta.popularity ?? 0) >= 60) totals.spectacle += 0.25

  const facets = emptyVector()
  for (const facet of Object.keys(totals) as FacetId[]) facets[facet] = squash(totals[facet])

  // Evidence is only shown for facets the film actually ended up expressing.
  for (const facet of Object.keys(tags) as FacetId[]) {
    if (facets[facet] < 0.2) delete tags[facet]
  }

  return { facets, tags }
}
