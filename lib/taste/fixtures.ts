import type { FacetId, FacetVector, RatedFilm, TasteFilm } from './engine'

/**
 * Fixture catalog for "Why Did I Love That?".
 *
 * Used when the experience runs without a member's own ratings (the labeled
 * demo), in unit tests, and in the offline evaluation. Titles, years, runtimes
 * and genres are checked against TMDb. The descriptors and one-line premises
 * are written for this file. They are not TMDb text, and the ratings are
 * approximate. Nothing here describes how a story turns out.
 */

export interface FixtureFilm {
  tmdbId: number
  title: string
  year: number
  runtime: number
  genreIds: number[]
  voteAverage: number
  keywords: string[]
  premise: string
}

function film(
  tmdbId: number,
  title: string,
  year: number,
  runtime: number,
  genreIds: number[],
  voteAverage: number,
  keywords: string[],
  premise: string,
): FixtureFilm {
  return { tmdbId, title, year, runtime, genreIds, voteAverage, keywords, premise }
}

export const FIXTURE_FILMS: FixtureFilm[] = [
  // The sample viewer's rated films
  film(157336, 'Interstellar', 2014, 169, [12, 18, 878], 8.4,
    ['father daughter relationship', 'family relationships', 'physics', 'time travel', 'space', 'epic', 'imax'],
    'A former pilot joins a mission through deep space to find a new home for humanity.'),
  film(335984, 'Blade Runner 2049', 2017, 164, [878, 18], 7.6,
    ['neo-noir', 'cyberpunk', 'slow burn', 'artificial intelligence', 'philosophical', 'visually striking', 'dystopia'],
    'A young blade runner follows a case into the past of a rain-soaked future Los Angeles.'),
  film(329865, 'Arrival', 2016, 116, [18, 878, 9648], 7.6,
    ['linguistics', 'first contact', 'mother daughter relationship', 'philosophical', 'nonlinear narrative', 'slow burn'],
    'A linguist is asked to find a way to communicate with visitors who have arrived on Earth.'),
  film(76341, 'Mad Max: Fury Road', 2015, 121, [28, 12, 878], 7.6,
    ['post-apocalyptic', 'car chase', 'chase', 'practical effects', 'fast paced', 'desert', 'violence', 'world building'],
    'In a desert wasteland, a drifter and a rig driver flee a warlord across open country.'),
  film(496243, 'Parasite', 2019, 133, [35, 53, 18], 8.5,
    ['social commentary', 'dark comedy', 'working class', 'family relationships', 'psychological thriller'],
    'A struggling family sees an opening when one of them is hired by a wealthy household.'),
  film(152601, 'Her', 2013, 126, [10749, 878, 18], 7.9,
    ['artificial intelligence', 'romance', 'loneliness', 'love', 'philosophical', 'intimate'],
    'A lonely writer forms a bond with his new operating system.'),
  film(290250, 'The Nice Guys', 2016, 116, [35, 80, 28], 7.1,
    ['buddy comedy', 'detective', 'witty', 'slapstick comedy'],
    'A mismatched pair of investigators take a missing-person case in 1970s Los Angeles.'),
  film(493922, 'Hereditary', 2018, 128, [27, 9648, 53], 7.3,
    ['disturbing', 'family relationships', 'slow burn', 'psychological horror', 'bleak'],
    'A family is unsettled by what its late matriarch left behind.'),

  // Candidates
  film(686, 'Contact', 1997, 150, [18, 878, 9648], 7.4,
    ['first contact', 'science', 'philosophical', 'father daughter relationship', 'space'],
    'A radio astronomer picks up a signal that seems to come from another star.'),
  film(9693, 'Children of Men', 2006, 109, [878, 53, 28], 7.6,
    ['dystopia', 'chase', 'survival', 'social commentary', 'naturalistic'],
    'In a near future without children, a weary bureaucrat agrees to escort a refugee.'),
  film(300668, 'Annihilation', 2018, 115, [878, 27], 6.4,
    ['surrealism', 'isolation', 'body horror', 'visually striking', 'philosophical'],
    'A biologist joins an expedition into a quarantined zone where nature no longer behaves.'),
  film(17431, 'Moon', 2009, 97, [878, 18], 7.6,
    ['isolation', 'artificial intelligence', 'minimalist', 'low budget', 'loneliness', 'philosophical'],
    'A lone worker nears the end of a three-year contract at a lunar mining base.'),
  film(14337, 'Primer', 2004, 77, [878, 18, 53], 6.8,
    ['time travel', 'physics', 'low budget', 'nonlinear narrative', 'dialogue driven'],
    'Two engineers working in a garage stumble onto something they did not set out to build.'),
  film(1124, 'The Prestige', 2006, 130, [18, 9648, 878], 8.2,
    ['period drama', 'nonlinear narrative', 'cat and mouse'],
    'Two stage magicians in Victorian London become obsessed with outdoing each other.'),
  film(38, 'Eternal Sunshine of the Spotless Mind', 2004, 108, [878, 18, 10749], 8.1,
    ['romance', 'love', 'nonlinear narrative', 'surrealism', 'technology'],
    'After a breakup, a man signs up for a procedure that promises to erase the relationship from memory.'),
  film(965150, 'Aftersun', 2022, 101, [18], 7.6,
    ['father daughter relationship', 'nostalgia', 'slice of life', 'naturalistic', 'slow burn', 'intimate'],
    'A woman looks back on a holiday she took with her father when she was eleven.'),
  film(391713, 'Lady Bird', 2017, 94, [18, 35], 7.3,
    ['coming of age', 'mother daughter relationship', 'witty', 'slice of life'],
    'A high-school senior in Sacramento spends her last year at home pushing against it.'),
  film(334541, 'Manchester by the Sea', 2016, 138, [18], 7.5,
    ['family relationships', 'grief', 'naturalistic', 'working class', 'slow burn'],
    'A janitor returns to his hometown to look after his teenage nephew.'),
  film(153, 'Lost in Translation', 2003, 102, [18, 35, 10749], 7.4,
    ['loneliness', 'friendship', 'slow burn', 'wistful', 'intimate'],
    'Two Americans at loose ends in Tokyo keep each other company.'),
  film(76, 'Before Sunrise', 1995, 101, [18, 10749], 8.0,
    ['romance', 'dialogue driven', 'love', 'slice of life'],
    'Two strangers meet on a train and spend one night walking around Vienna.'),
  film(531428, 'Portrait of a Lady on Fire', 2019, 121, [18, 10749], 8.1,
    ['romance', 'period drama', 'slow burn', 'visually striking', 'intimate'],
    'A painter is hired to make a portrait of a woman who refuses to sit for one.'),
  film(1949, 'Zodiac', 2007, 157, [80, 9648, 53], 7.5,
    ['investigation', 'journalism', 'based on true story', 'procedural', 'serial killer', 'paranoia'],
    'A cartoonist, a reporter and a detective are drawn into a years-long hunt in 1970s San Francisco.'),
  film(146233, 'Prisoners', 2013, 153, [18, 53, 80], 8.1,
    ['investigation', 'kidnapping', 'bleak', 'detective', 'family relationships'],
    'When two girls go missing, one father decides the police are not moving fast enough.'),
  film(273481, 'Sicario', 2015, 122, [28, 80, 53], 7.4,
    ['violence', 'bleak', 'procedural', 'paranoia', 'desert'],
    'An FBI agent is recruited to a task force working along the US-Mexico border.'),
  film(314365, 'Spotlight', 2015, 129, [18, 36], 7.8,
    ['journalism', 'based on true story', 'investigation', 'procedural', 'ensemble cast'],
    'A newspaper’s investigative team spends a year on one story.'),
  film(37799, 'The Social Network', 2010, 121, [18], 7.4,
    ['biography', 'dialogue driven', 'witty', 'technology', 'friendship'],
    'A Harvard student builds a website and falls out with the people around him.'),
  film(318846, 'The Big Short', 2015, 131, [35, 18], 7.4,
    ['finance', 'based on true story', 'satire', 'witty', 'ensemble cast'],
    'A handful of outsiders bet against the housing market before 2008.'),
  film(242582, 'Nightcrawler', 2014, 118, [80, 18, 53], 7.7,
    ['neo-noir', 'character study', 'journalism', 'satire', 'bleak', 'psychological thriller'],
    'A drifter in Los Angeles finds work filming crime scenes for local news.'),
  film(64690, 'Drive', 2011, 100, [18, 53, 80], 7.6,
    ['neo-noir', 'car chase', 'violence', 'slow burn', 'visually striking'],
    'A stunt driver who moonlights as a getaway driver gets involved with his neighbour.'),
  film(245891, 'John Wick', 2014, 101, [28, 53], 7.4,
    ['revenge', 'martial arts', 'fast paced', 'violence', 'world building'],
    'A retired hitman is pulled back into the world he left.'),
  film(137113, 'Edge of Tomorrow', 2014, 114, [28, 878], 7.6,
    ['time travel', 'battle', 'fast paced', 'witty'],
    'A soldier with no combat experience finds himself reliving the same battle.'),
  film(353081, 'Mission: Impossible - Fallout', 2018, 147, [28, 12], 7.4,
    ['spy', 'chase', 'practical effects', 'race against time', 'fast paced'],
    'An agent and his team race to recover stolen plutonium.'),
  film(361743, 'Top Gun: Maverick', 2022, 131, [28, 18], 8.2,
    ['aerial combat', 'practical effects', 'blockbuster', 'friendship', 'feel good'],
    'A veteran test pilot returns to train a class of young aviators for one mission.'),
  film(438631, 'Dune', 2021, 155, [878, 12], 7.8,
    ['epic', 'world building', 'space opera', 'desert', 'visually striking', 'politics'],
    'A noble family takes control of a desert planet that everyone else wants.'),
  film(286217, 'The Martian', 2015, 141, [878, 18, 12], 7.7,
    ['science', 'survival', 'witty', 'space', 'feel good'],
    'An astronaut stranded on Mars has to work out how to stay alive until help can reach him.'),
  film(49047, 'Gravity', 2013, 91, [878, 53, 18], 7.2,
    ['survival', 'space', 'race against time', 'visually striking', 'imax'],
    'Two astronauts are cut loose from their shuttle in orbit.'),
  film(62, '2001: A Space Odyssey', 1968, 149, [878, 9648, 12], 8.1,
    ['philosophical', 'artificial intelligence', 'space', 'slow burn', 'meditative', 'visually striking', 'epic'],
    'A mission to Jupiter follows a discovery buried on the Moon.'),
  film(1398, 'Stalker', 1979, 162, [878, 18], 8.1,
    ['philosophical', 'meditative', 'slow burn', 'dreamlike', 'minimalist'],
    'A guide leads two men into a forbidden zone said to grant wishes.'),
  film(593, 'Solaris', 1972, 167, [18, 878, 9648], 7.8,
    ['philosophical', 'meditative', 'slow burn', 'space', 'loneliness', 'love'],
    'A psychologist is sent to a space station whose crew has stopped making sense.'),
  film(220289, 'Coherence', 2014, 89, [53, 878], 7.2,
    ['alternate reality', 'low budget', 'chamber piece', 'paranoia', 'dialogue driven'],
    'A dinner party goes strange on the night a comet passes overhead.'),
  film(545611, 'Everything Everywhere All at Once', 2022, 140, [28, 12, 878], 7.8,
    ['alternate reality', 'mother daughter relationship', 'martial arts', 'absurd', 'family relationships'],
    'A laundromat owner in the middle of a tax audit is told she has to save every version of the world.'),
  film(120467, 'The Grand Budapest Hotel', 2014, 100, [35, 18], 8.0,
    ['whimsical', 'witty', 'period drama', 'visually striking', 'friendship'],
    'A hotel concierge and his lobby boy get caught up in a dispute over a fortune.'),
  film(346648, 'Paddington 2', 2017, 104, [12, 35, 10751], 7.5,
    ['feel good', 'whimsical', 'family relationships', 'witty'],
    'A bear in London takes odd jobs to buy a present and ends up in trouble.'),
  film(587792, 'Palm Springs', 2020, 90, [35, 10749, 878], 7.4,
    ['romance', 'witty', 'philosophical', 'feel good'],
    'Two wedding guests find themselves stuck together at a desert resort.'),
  film(122906, 'About Time', 2013, 123, [18, 10749, 14], 7.9,
    ['time travel', 'romance', 'father son relationship', 'family relationships', 'feel good'],
    'A young man learns the men in his family can revisit moments of their own lives.'),
  film(776503, 'CODA', 2021, 112, [18, 10402, 10749], 7.9,
    ['family relationships', 'coming of age', 'feel good'],
    'The only hearing member of a fishing family discovers she loves to sing.'),
  film(129, 'Spirited Away', 2001, 125, [16, 10751, 14], 8.5,
    ['world building', 'dreamlike', 'coming of age', 'whimsical', 'visually striking'],
    'A girl wanders into a bathhouse for spirits and has to find a way to work there.'),
  film(508442, 'Soul', 2020, 101, [16, 10751, 18, 10402, 14], 8.1,
    ['philosophical', 'whimsical', 'feel good', 'friendship'],
    'A music teacher gets the gig of his life and then gets separated from it.'),
  film(359724, 'Ford v Ferrari', 2019, 153, [18, 36, 28], 8.0,
    ['based on true story', 'sports', 'friendship', 'practical effects', 'fast paced'],
    'A car designer and a driver set out to build a machine that can win at Le Mans.'),
  film(568, 'Apollo 13', 1995, 140, [18, 36], 7.5,
    ['based on true story', 'space', 'survival', 'science', 'procedural', 'race against time'],
    'Three astronauts and mission control improvise after an accident on the way to the Moon.'),
  film(515042, 'Free Solo', 2018, 100, [99, 12], 7.9,
    ['naturalistic', 'character study', 'wilderness'],
    'A climber prepares to scale El Capitan without ropes.'),
  film(419430, 'Get Out', 2017, 104, [9648, 53, 27], 7.6,
    ['social commentary', 'psychological thriller', 'paranoia', 'satire'],
    'A photographer spends a weekend meeting his girlfriend’s parents.'),
  film(503919, 'The Lighthouse', 2019, 109, [18, 14, 53], 7.5,
    ['isolation', 'gothic', 'surrealism', 'psychological thriller', 'visually striking', 'bleak'],
    'Two keepers are posted to a remote lighthouse in the 1890s.'),
  film(872585, 'Oppenheimer', 2023, 181, [18, 36], 8.1,
    ['biography', 'based on true story', 'physics', 'politics', 'dialogue driven', 'epic'],
    'A physicist is put in charge of a secret wartime laboratory.'),
  film(27205, 'Inception', 2010, 148, [28, 878, 12], 8.4,
    ['heist', 'dreamlike', 'nonlinear narrative', 'world building', 'blockbuster'],
    'A thief who steals from people’s dreams is offered a job that runs the other way.'),
  film(603, 'The Matrix', 1999, 136, [28, 878], 8.2,
    ['cyberpunk', 'philosophical', 'martial arts', 'dystopia', 'artificial intelligence'],
    'A programmer starts to suspect the world around him is not what it appears to be.'),
  film(155, 'The Dark Knight', 2008, 152, [28, 53, 80], 8.5,
    ['superhero', 'cat and mouse', 'neo-noir', 'blockbuster'],
    'Gotham’s vigilante faces a criminal who wants chaos more than money.'),
  film(244786, 'Whiplash', 2014, 107, [18, 10402, 53], 8.4,
    ['character study', 'fast paced', 'intense', 'intimate'],
    'A young drummer enrols under a conductor who accepts nothing short of perfect.'),
  film(313369, 'La La Land', 2016, 129, [35, 18, 10749], 7.9,
    ['romance', 'love', 'nostalgia', 'visually striking'],
    'An actress and a jazz pianist fall for each other while chasing work in Los Angeles.'),
  film(376867, 'Moonlight', 2016, 112, [18], 7.4,
    ['coming of age', 'character study', 'naturalistic', 'intimate', 'slow burn'],
    'Three chapters in the life of a boy growing up in Miami.'),
  film(530915, '1917', 2019, 119, [10752, 18, 36], 8.0,
    ['war', 'race against time', 'visually striking', 'survival'],
    'Two soldiers are sent across enemy lines with a message.'),
  film(374720, 'Dunkirk', 2017, 107, [10752, 28, 18], 7.5,
    ['war', 'survival', 'nonlinear narrative', 'based on true story', 'practical effects'],
    'Soldiers, sailors and pilots try to get an army off a beach.'),
  film(577922, 'Tenet', 2020, 150, [28, 53, 878], 7.2,
    ['spy', 'time travel', 'physics', 'fast paced', 'blockbuster', 'practical effects'],
    'An agent is handed a single word and a mission that bends the rules of time.'),
  film(264660, 'Ex Machina', 2015, 108, [18, 878], 7.6,
    ['artificial intelligence', 'chamber piece', 'isolation', 'philosophical', 'psychological thriller'],
    'A programmer is invited to a remote estate to evaluate a new kind of machine.'),
  film(331482, 'Little Women', 2019, 135, [18, 10749], 7.9,
    ['family relationships', 'siblings', 'coming of age', 'period drama', 'nonlinear narrative'],
    'Four sisters grow up in Massachusetts in the years after the Civil War.'),
  film(807, 'Se7en', 1995, 127, [80, 9648, 53], 8.4,
    ['serial killer', 'detective', 'neo-noir', 'bleak', 'investigation', 'disturbing'],
    'Two detectives track a killer working through a pattern.'),
  film(546554, 'Knives Out', 2019, 131, [35, 80, 9648], 7.8,
    ['whodunit', 'witty', 'ensemble cast', 'detective'],
    'A private detective questions a wealthy family gathered at its country house.'),
  film(666277, 'Past Lives', 2023, 106, [18, 10749], 7.7,
    ['romance', 'childhood friends', 'nostalgia', 'intimate', 'slow burn'],
    'Two childhood friends from Seoul find each other again decades later.'),
]

/**
 * One rating sheet, shared by both sample viewers below. Loving these six films
 * does not say why: they are strong on relationships, ideas, atmosphere and
 * spectacle all at once.
 */
export const FIXTURE_RATINGS: Array<{ tmdbId: number; score: number }> = [
  { tmdbId: 157336, score: 95 },
  { tmdbId: 335984, score: 90 },
  { tmdbId: 329865, score: 88 },
  { tmdbId: 496243, score: 87 },
  { tmdbId: 76341, score: 86 },
  { tmdbId: 152601, score: 84 },
  { tmdbId: 290250, score: 58 },
  { tmdbId: 493922, score: 45 },
]

/**
 * Two people with the same ratings and different reasons. `order` is what each
 * cares about, most important first. Tests and the evaluation answer questions
 * with it; the demo banner describes it so a presenter can do the same by hand.
 */
export interface FixtureViewer {
  id: string
  name: string
  blurb: string
  order: FacetId[]
}

export const FIXTURE_VIEWERS: FixtureViewer[] = [
  {
    id: 'maya',
    name: 'Maya',
    blurb: 'Watches for the people. Pick the relationship or atmosphere option whenever one is offered.',
    order: ['relationships', 'atmosphere', 'humor'],
  },
  {
    id: 'jonah',
    name: 'Jonah',
    blurb: 'Watches for the ideas. Pick the ideas, pace or tension option whenever one is offered.',
    order: ['ideas', 'momentum', 'tension'],
  },
]

interface FixtureDeps {
  deriveFacets: (meta: { genreIds: number[]; keywords: string[]; runtime: number | null; popularity: number | null }) => {
    facets: FacetVector
    tags: Partial<Record<FacetId, string[]>>
  }
  /** Rating-style normalization, one affinity per score (Movie DNA's own). */
  affinities: (scores: number[]) => number[]
}

/**
 * The sample viewer's rated films and the candidates left to recommend.
 * Dependencies are passed in so this file stays importable on its own.
 */
export function buildFixtureSet(deps: FixtureDeps): { rated: RatedFilm[]; candidates: TasteFilm[] } {
  const films = FIXTURE_FILMS.map(item => ({
    tmdbId: item.tmdbId,
    title: item.title,
    year: item.year,
    posterPath: null,
    genreIds: item.genreIds,
    runtime: item.runtime,
    voteAverage: item.voteAverage,
    ...deps.deriveFacets({ genreIds: item.genreIds, keywords: item.keywords, runtime: item.runtime, popularity: null }),
  }))
  const byId = new Map(films.map(item => [item.tmdbId, item]))
  const affinities = deps.affinities(FIXTURE_RATINGS.map(rating => rating.score))
  const rated = FIXTURE_RATINGS.map((rating, index) => ({
    ...byId.get(rating.tmdbId)!,
    score: rating.score,
    affinity: affinities[index],
  }))
  const ratedIds = new Set(FIXTURE_RATINGS.map(rating => rating.tmdbId))
  return { rated, candidates: films.filter(item => !ratedIds.has(item.tmdbId)) }
}

/** How a viewer with a known order of priorities answers a two-option question. */
export function answerAs(order: FacetId[], facetA: FacetId, facetB: FacetId): 'a' | 'b' | 'both' | 'neither' {
  const rankA = order.indexOf(facetA)
  const rankB = order.indexOf(facetB)
  if (rankA === -1 && rankB === -1) return 'neither'
  if (rankA === -1) return 'b'
  if (rankB === -1) return 'a'
  if (rankA <= 1 && rankB <= 1) return 'both'
  return rankA < rankB ? 'a' : 'b'
}
