// Movie guides are the public, indexable recommendation lists that target
// searches such as "best thriller movies" or "movies under 90 minutes".
//
// Each guide is written by hand for one search intent. Do not generate guides
// from templates or keyword permutations: Google treats near-duplicate pages
// made mainly for ranking as scaled content abuse, which can demote the site.
// A new guide needs its own query, its own copy, and a reason to exist.
//
// Copy must stay true for any film the query can return, so it describes the
// genre and how to choose within it. It never names or describes a film.

import type { TMDbMovie } from '../types'

export interface MovieGuideQuestion {
  question: string
  answer: string
}

export interface MovieGuide {
  slug: string
  /** Genre guides and occasion guides are listed separately on the hub. */
  group: 'genre' | 'occasion'
  /** Short name for links, breadcrumbs, and the footer. */
  label: string
  /** The visible H1. */
  heading: string
  /** The title tag; the root layout appends the site name. */
  title: string
  description: string
  intro: [string, string]
  /** How the list is selected. Shown on the page and must match `query`. */
  method: string
  spoilerTip: string
  questions: MovieGuideQuestion[]
  related: string[]
  /** The TMDb genre whose badge on a movie page links to this guide. */
  genreId?: number
  /** TMDb /discover/movie parameters. `today` is a UTC YYYY-MM-DD date. */
  query: (today: string) => Record<string, string>
}

export const GUIDE_LIST_SIZE = 20

const BASE_QUERY = { include_adult: 'false', include_video: 'false' }

// Ranking by score alone favors films with a handful of perfect votes, so
// every "best" list requires a vote count that represents broad agreement.
function highestRated(minVotes: number, filters: Record<string, string> = {}) {
  return (today: string) => ({
    ...BASE_QUERY,
    sort_by: 'vote_average.desc',
    'vote_count.gte': String(minVotes),
    'primary_release_date.lte': today,
    ...filters,
  })
}

function daysBefore(today: string, days: number): string {
  const date = new Date(`${today}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - days)
  return date.toISOString().slice(0, 10)
}

export const MOVIE_GUIDES: MovieGuide[] = [
  {
    slug: 'best-movies-of-all-time',
    group: 'occasion',
    label: 'Best movies of all time',
    heading: 'The best movies of all time',
    title: 'Best Movies of All Time, Spoiler-Free',
    description: 'The highest-rated movies of all time, ranked by audience score across at least 10,000 votes each. No plot summaries, just what you need to choose.',
    intro: [
      'Every film here has been rated by at least 10,000 people on TMDb, so a high score reflects broad agreement rather than a small group of devoted fans. That makes this list a reliable place to start when you want something widely loved and would rather not gamble an evening.',
      'We leave out plot summaries on purpose. Many of these films are famous enough that their biggest moments are common knowledge, so if you have somehow avoided them, you are in a rare position. Open a movie to check its runtime, vibe, and who it suits before you commit.',
    ],
    method: 'Ranked by TMDb audience score among films with at least 10,000 votes. The list refreshes daily.',
    spoilerTip: 'Fame is the spoiler risk here. Avoid search suggestions, video thumbnails, and "ending explained" videos for a film you plan to watch, because they tend to surface the biggest reveals.',
    questions: [
      {
        question: 'Why are some famous films missing?',
        answer: 'Only films with at least 10,000 TMDb votes qualify, and the list shows the top 20 by score. A film can be influential without being among the highest rated by audiences, and newer releases may not have enough votes yet.',
      },
      {
        question: 'Is it worth avoiding spoilers for an old classic?',
        answer: 'Yes, if you have not seen it. Great films hold up when you know where they go, but you only get to be surprised once. A classic you know nothing about is worth protecting.',
      },
    ],
    related: ['movies-to-watch-blind', 'best-drama-movies', 'hidden-gem-movies'],
    query: highestRated(10_000),
  },
  {
    slug: 'movies-to-watch-blind',
    group: 'occasion',
    label: 'Movies to watch blind',
    heading: 'Movies to watch knowing nothing',
    title: 'Movies to Watch Blind: Go In Knowing Nothing',
    description: 'The best mystery movies to go into blind. Highly rated films where the less you know the better, listed without plot summaries, cast lists, or trailers.',
    intro: [
      'Some films depend on what you do not know. Mysteries are built around information the story withholds, so a trailer, a synopsis, or even a cast list can give away the moment the film is working toward.',
      'This list contains only highly rated mysteries and leaves out every plot detail. If a title catches your eye, open it in Blind mode, which hides the premise as well as the cast and trailers, and decide on runtime and rating alone.',
    ],
    method: 'Ranked by TMDb audience score among mystery films with at least 4,000 votes. The list refreshes daily.',
    spoilerTip: 'Even knowing that a film has a twist changes how you watch it. Avoid search suggestions and video thumbnails, which often add words like "twist" or "ending explained" to a title.',
    questions: [
      {
        question: 'What does it mean to watch a movie blind?',
        answer: 'Watching blind means starting a film without reading its synopsis, watching its trailer, or checking its cast. You let the film introduce its own story instead of arriving with expectations.',
      },
      {
        question: 'Can I check whether a movie suits me without spoilers?',
        answer: 'Yes. Runtime, genre, release year, and audience score tell you a lot without revealing the story. Each movie page also has a vibe profile that scores suspense, humor, darkness, and complexity without describing what happens.',
      },
    ],
    related: ['best-thriller-movies', 'best-crime-movies', 'best-movies-of-all-time'],
    genreId: 9648,
    query: highestRated(4_000, { with_genres: '9648' }),
  },
  {
    slug: 'best-thriller-movies',
    group: 'genre',
    label: 'Best thriller movies',
    heading: 'The best thriller movies',
    title: 'Best Thriller Movies of All Time, Without Spoilers',
    description: 'The highest-rated thriller movies, ranked by audience score. Find a tense, gripping film for tonight without plot summaries that give the turns away.',
    intro: [
      'A thriller works by controlling what you know and when you learn it. Tension comes from uncertainty, so a detailed synopsis can flatten a film that would otherwise keep you leaning forward.',
      'Every film here is a thriller rated by at least 3,000 people on TMDb. Use the runtime to plan your evening: thrillers range from tight 90-minute films to slow-burn epics, and pacing matters more here than in most genres.',
    ],
    method: 'Ranked by TMDb audience score among thrillers with at least 3,000 votes. The list refreshes daily.',
    spoilerTip: 'Thriller trailers often draw on scenes from the second half of the film. If you are already interested, skip the trailer and let the opening scene do the selling.',
    questions: [
      {
        question: 'What is the difference between a thriller and a mystery?',
        answer: 'A mystery is built around a question, usually who did something or why. A thriller is built around danger and suspense. Many films are both, and TMDb often tags them with both genres.',
      },
      {
        question: 'Are thrillers scary?',
        answer: 'Thrillers aim for tension rather than fear, but some include violence or disturbing scenes. Check the genre tags on a movie page: a thriller also tagged Horror is likely to be more intense.',
      },
    ],
    related: ['movies-to-watch-blind', 'best-crime-movies', 'best-horror-movies'],
    genreId: 53,
    query: highestRated(3_000, { with_genres: '53' }),
  },
  {
    slug: 'best-horror-movies',
    group: 'genre',
    label: 'Best horror movies',
    heading: 'The best horror movies',
    title: 'Best Horror Movies of All Time, Spoiler-Free',
    description: 'The highest-rated horror movies, ranked by audience score. Pick a scary movie for tonight without trailers or plot summaries giving away the biggest scares.',
    intro: [
      'Horror depends on surprise more than any other genre. A scare you have already seen in a trailer loses most of its effect, and a creature you have already seen in a thumbnail is less frightening when it finally appears.',
      'Every film here is a horror movie rated by at least 1,500 people on TMDb. Some horror is slow and unsettling, and some relies on shocks, so check the vibe profile on a movie page before you choose.',
    ],
    method: 'Ranked by TMDb audience score among horror films with at least 1,500 votes. The list refreshes daily.',
    spoilerTip: 'Horror marketing often shows the creature, the killer, or the biggest jump scare. Avoid the trailer, and avoid posters for any sequels, which can reveal who survives the first film.',
    questions: [
      {
        question: 'What is a good horror movie for someone who scares easily?',
        answer: 'Look for films also tagged Comedy or Mystery, which tend to balance fear with something lighter. The vibe profile on each movie page scores darkness and suspense, so you can judge the intensity before you press play.',
      },
      {
        question: 'Do I need to see the original before a horror sequel?',
        answer: 'Usually, yes. Horror sequels often open by revealing how the previous film ended, including who survived. Watch the original first if you want to see it unspoiled.',
      },
    ],
    related: ['best-thriller-movies', 'short-movies-under-90-minutes', 'hidden-gem-movies'],
    genreId: 27,
    query: highestRated(1_500, { with_genres: '27' }),
  },
  {
    slug: 'best-sci-fi-movies',
    group: 'genre',
    label: 'Best sci-fi movies',
    heading: 'The best science fiction movies',
    title: 'Best Sci-Fi Movies of All Time, Without Spoilers',
    description: 'The highest-rated science fiction movies, ranked by audience score. Find a sci-fi film to watch tonight without plot summaries explaining the big ideas.',
    intro: [
      'Science fiction often asks you to discover how its world works. Part of the pleasure is figuring out the rules for yourself, which a synopsis or trailer can explain away in a sentence.',
      'Every film here is science fiction rated by at least 3,000 people on TMDb. The genre covers everything from space adventures to quiet, idea-driven dramas, so use the genre tags and the complexity and action scores on a movie page to find the evening you want.',
    ],
    method: 'Ranked by TMDb audience score among science fiction films with at least 3,000 votes. The list refreshes daily.',
    spoilerTip: 'In science fiction, the premise itself can be the reveal. Some films hold back what is really going on until late in the story, so watch the opening minutes before you read anything about it.',
    questions: [
      {
        question: 'What is a good sci-fi movie for someone new to the genre?',
        answer: 'Start with a film also tagged Adventure or Action. These tend to be easier to follow than idea-driven science fiction. Films also tagged Drama are often slower and more reflective.',
      },
      {
        question: 'Do I need to understand the science to enjoy sci-fi?',
        answer: 'No. Good science fiction explains what you need as the story goes, and most films care more about their characters than the technical details.',
      },
    ],
    related: ['best-action-movies', 'movies-to-watch-blind', 'best-animated-movies'],
    genreId: 878,
    query: highestRated(3_000, { with_genres: '878' }),
  },
  {
    slug: 'best-comedy-movies',
    group: 'genre',
    label: 'Best comedy movies',
    heading: 'The best comedy movies',
    title: 'Best Comedy Movies of All Time, Spoiler-Free',
    description: 'The highest-rated live-action comedies, ranked by audience score. Find a funny movie to watch tonight without a trailer giving away the best jokes.',
    intro: [
      'Comedy trailers face an awkward problem: the quickest way to sell a funny film is to show its funniest moments. If you have seen the trailer, you may have already heard the best lines.',
      'Every film here is a live-action comedy rated by at least 2,000 people on TMDb. Animated comedies have their own list. Comedy ranges from gentle and warm to sharp and dark, so the genre tags and the humor and darkness scores on each movie page help you find the right tone.',
    ],
    method: 'Ranked by TMDb audience score among live-action comedies with at least 2,000 votes. The list refreshes daily.',
    spoilerTip: 'Comedies rarely have plot twists, but jokes have their own kind of spoiler. If you are already sure you want to watch, skip the clips and let the timing land the first time.',
    questions: [
      {
        question: 'Why are some dramas on this list?',
        answer: 'TMDb lets a film carry several genres. A film tagged both Comedy and Drama appears here when audiences rated it highly. Check the genre tags for the balance of laughs and serious moments.',
      },
      {
        question: 'Where are the animated comedies?',
        answer: 'They are on the animated movies list, which keeps this list focused on live-action films.',
      },
    ],
    related: ['best-romantic-comedies', 'best-family-movies', 'short-movies-under-90-minutes'],
    genreId: 35,
    query: highestRated(2_000, { with_genres: '35', without_genres: '16' }),
  },
  {
    slug: 'best-romantic-comedies',
    group: 'genre',
    label: 'Best romantic comedies',
    heading: 'The best romantic comedies',
    title: 'Best Romantic Comedies of All Time, Spoiler-Free',
    description: 'The highest-rated romantic comedies, ranked by audience score. Pick a rom-com for date night or a night in, without trailers giving the best moments away.',
    intro: [
      'You usually know roughly where a romantic comedy is heading. What you do not know is how it gets there, and that is where the genre does its work: the first meeting, the misunderstandings, and the lines that land because you did not see them coming.',
      'Every film here is tagged both Romance and Comedy and has been rated by at least 1,000 people on TMDb. Signed-in members with a Movie DNA profile also get a Rom-Com DNA Roast on each rom-com page, a playful read on how the film fits their taste.',
    ],
    method: 'Ranked by TMDb audience score among live-action films tagged both Romance and Comedy with at least 1,000 votes. The list refreshes daily.',
    spoilerTip: 'Rom-com trailers often trace the whole story, from the first meeting to the grand gesture. If you already know you want to watch it, skip the trailer and go straight to the film.',
    questions: [
      {
        question: 'What is a good romantic comedy for date night?',
        answer: 'Choose something neither of you has seen, check the runtime, and look at the vibe profile on the movie page. A high humor score and a low darkness score usually suit a relaxed evening.',
      },
      {
        question: 'Can knowing the ending spoil a romantic comedy?',
        answer: 'Less than in most genres, because the ending is part of the promise. The surprises are in the jokes and in how the story gets there, and those are what trailers tend to give away.',
      },
    ],
    related: ['best-comedy-movies', 'best-drama-movies', 'short-movies-under-90-minutes'],
    query: highestRated(1_000, { with_genres: '10749,35', without_genres: '16' }),
  },
  {
    slug: 'best-animated-movies',
    group: 'genre',
    label: 'Best animated movies',
    heading: 'The best animated movies',
    title: 'Best Animated Movies of All Time, Spoiler-Free',
    description: 'The highest-rated animated movies, ranked by audience score. Family favorites and animation made for adults, listed without plot summaries.',
    intro: [
      'Animation is a medium, not a genre for children. This list includes family favorites alongside films made for adults, and some highly rated animated films are emotionally heavy. Check the genre tags before choosing one for younger viewers.',
      'Every film here is animated and has been rated by at least 2,000 people on TMDb. The list is not limited to English-language films, so some titles may be offered with subtitles or dubbing, depending on where you watch.',
    ],
    method: 'Ranked by TMDb audience score among animated films with at least 2,000 votes. The list refreshes daily.',
    spoilerTip: 'Trailers for animated films are often made for children and can show much of the story. If a film is already on your list, skip the trailer.',
    questions: [
      {
        question: 'Are all of these movies suitable for kids?',
        answer: 'No. Some highly rated animated films deal with war, grief, or violence. Films also tagged Family are usually the safest choice for younger viewers. For live-action picks, see the family movies list.',
      },
      {
        question: 'What should I watch if I love animation but want something for adults?',
        answer: 'Look for animated films tagged Drama, Science Fiction, or War rather than Family. They tend to be aimed at older audiences.',
      },
    ],
    related: ['best-family-movies', 'best-sci-fi-movies', 'short-movies-under-90-minutes'],
    genreId: 16,
    query: highestRated(2_000, { with_genres: '16' }),
  },
  {
    slug: 'best-family-movies',
    group: 'genre',
    label: 'Best family movies',
    heading: 'The best family movies',
    title: 'Best Family Movies to Watch Together',
    description: 'The highest-rated live-action family movies, ranked by audience score. Find a film the whole family can watch tonight, without spoilers for anyone.',
    intro: [
      'Choosing a family movie means finding something that works for several ages at once. The films here are tagged Family on TMDb and have each been rated by at least 1,500 people, so a large audience has already tested them.',
      'This list focuses on live-action films, and animated family films have their own list. Runtime matters with younger viewers, so check it on the movie page along with the genre tags for anything that may be too intense.',
    ],
    method: 'Ranked by TMDb audience score among live-action family films with at least 1,500 votes. The list refreshes daily.',
    spoilerTip: 'If you are watching with children who have not seen a film, keep the trailer off the TV. Kids tend to remember trailers in detail and will happily announce what happens next.',
    questions: [
      {
        question: 'How do I know if a movie is right for my kids?',
        answer: 'Start with the genre tags: films also tagged Horror, Thriller, or War are usually more intense. Each movie page also shows who a film suits. For official age ratings, check your local ratings board or streaming service.',
      },
      {
        question: 'Are these movies animated?',
        answer: 'No. This list is live-action only. See the animated movies list for animated family films.',
      },
    ],
    related: ['best-animated-movies', 'best-comedy-movies', 'short-movies-under-90-minutes'],
    genreId: 10751,
    query: highestRated(1_500, { with_genres: '10751', without_genres: '16' }),
  },
  {
    slug: 'best-action-movies',
    group: 'genre',
    label: 'Best action movies',
    heading: 'The best action movies',
    title: 'Best Action Movies of All Time, Without Spoilers',
    description: 'The highest-rated action movies, ranked by audience score. Find an exciting movie for tonight without trailers that reveal every big set piece.',
    intro: [
      'Action films sell themselves with their biggest moments, and trailers often include them. By the time you sit down, you may have already seen the best stunt three times.',
      'Every film here is tagged Action and has been rated by at least 3,000 people on TMDb. Action blends with almost every genre, from science fiction to crime to comedy, so the genre tags tell you what kind of action film you are getting.',
    ],
    method: 'Ranked by TMDb audience score among action films with at least 3,000 votes. The list refreshes daily.',
    spoilerTip: 'In a franchise, the poster and cast list for the next film can reveal who survives this one. If you are catching up on a series, avoid looking up later films until you reach them.',
    questions: [
      {
        question: 'Do I need to watch a franchise in order?',
        answer: 'Usually it helps. Later films often assume you know what happened earlier, and their marketing can reveal how previous films ended. The release year on each movie page helps you work out the order.',
      },
      {
        question: 'What is a good action movie that is not too violent?',
        answer: 'Look for films also tagged Adventure, Family, or Comedy, which tend to be lighter. Films also tagged Crime, Thriller, or War are usually more intense.',
      },
    ],
    related: ['best-sci-fi-movies', 'best-thriller-movies', 'best-crime-movies'],
    genreId: 28,
    query: highestRated(3_000, { with_genres: '28' }),
  },
  {
    slug: 'best-drama-movies',
    group: 'genre',
    label: 'Best drama movies',
    heading: 'The best drama movies',
    title: 'Best Drama Movies of All Time, Spoiler-Free',
    description: 'The highest-rated drama movies, ranked by audience score across at least 5,000 votes each. Find a moving, memorable film, listed without plot summaries.',
    intro: [
      'Drama is the broadest genre, and the hardest to choose from by title alone. A drama can be a courtroom story, a war film, a family portrait, or a biography. What they share is a focus on people and the choices they make.',
      'Every film here is tagged Drama and has been rated by at least 5,000 people on TMDb. Many are long, so check the runtime on the movie page, and use the darkness and emotion scores to tell a heavy film from a hopeful one.',
    ],
    method: 'Ranked by TMDb audience score among dramas with at least 5,000 votes. The list refreshes daily.',
    spoilerTip: 'Dramas based on true stories can be spoiled by history. If you do not know how events turned out, avoid reading about the real people involved before you watch.',
    questions: [
      {
        question: 'Are these movies sad?',
        answer: 'Some are, but not all. Drama covers hopeful and funny films too. Films also tagged Comedy or Romance tend to be lighter, while those tagged War or History are often heavier.',
      },
      {
        question: 'What is a good drama for a short evening?',
        answer: 'Check the runtime on each movie page, because many acclaimed dramas run over two hours. The short movies list collects highly rated films of 90 minutes or less.',
      },
    ],
    related: ['best-movies-of-all-time', 'best-crime-movies', 'hidden-gem-movies'],
    genreId: 18,
    query: highestRated(5_000, { with_genres: '18' }),
  },
  {
    slug: 'best-crime-movies',
    group: 'genre',
    label: 'Best crime movies',
    heading: 'The best crime movies',
    title: 'Best Crime Movies of All Time, Without Spoilers',
    description: 'The highest-rated crime movies, ranked by audience score. Heists, gangsters, and detective stories, listed without plot summaries that reveal the outcome.',
    intro: [
      'Crime films are built on plans, secrets, and consequences. Whether a story follows the people breaking the law or the people chasing them, the outcome is usually the point, and it is easy to stumble across.',
      'Every film here is tagged Crime and has been rated by at least 3,000 people on TMDb. Many crime films are long and violent, so check the runtime and genre tags on each movie page before you choose.',
    ],
    method: 'Ranked by TMDb audience score among crime films with at least 3,000 votes. The list refreshes daily.',
    spoilerTip: 'Famous crime films are quoted and referenced everywhere, often including their final scenes. If you have not seen one, do not look up its quotes or memes first.',
    questions: [
      {
        question: 'What is the difference between crime and thriller movies?',
        answer: 'Crime describes the subject: people committing or solving crimes. Thriller describes the feeling: suspense and danger. Many films are both, but crime dramas can be slow and focused on character rather than tension.',
      },
      {
        question: 'Are crime movies based on true stories?',
        answer: 'Some are. When a film is based on real events, the outcome may already be public. Avoid reading about the case before you watch if you want to be surprised.',
      },
    ],
    related: ['best-thriller-movies', 'movies-to-watch-blind', 'best-drama-movies'],
    genreId: 80,
    query: highestRated(3_000, { with_genres: '80' }),
  },
  {
    slug: 'best-documentaries',
    group: 'genre',
    label: 'Best documentaries',
    heading: 'The best documentaries',
    title: 'Best Documentaries to Watch, Spoiler-Free',
    description: 'The highest-rated documentary films, ranked by audience score. Find a true story worth watching, without summaries that reveal how it ends.',
    intro: [
      'Documentaries can be spoiled too. Many are structured like thrillers, holding back what happened until the right moment, and a summary written for search results often gives the ending away.',
      'Every film here is a documentary rated by at least 300 people on TMDb. Documentaries get fewer ratings than fiction, so the bar is lower than on other lists. Films tagged Music are left out so that concert films do not crowd out the storytelling.',
    ],
    method: 'Ranked by TMDb audience score among documentaries with at least 300 votes, excluding films tagged Music. The list refreshes daily.',
    spoilerTip: 'If a documentary covers a real event you know little about, avoid news coverage of it until you have watched. The film is usually designed to reveal what happened in a particular order.',
    questions: [
      {
        question: 'Can a documentary have spoilers?',
        answer: 'Yes. Documentaries about crimes, competitions, or investigations often build toward an outcome. If you do not know how the real story ended, the film can still surprise you.',
      },
      {
        question: 'Why are music documentaries missing?',
        answer: 'Films tagged Music are excluded so that concert films do not crowd out other documentaries. Search for a specific music documentary to find its page.',
      },
    ],
    related: ['hidden-gem-movies', 'best-crime-movies', 'best-drama-movies'],
    genreId: 99,
    query: highestRated(300, { with_genres: '99', without_genres: '10402' }),
  },
  {
    slug: 'short-movies-under-90-minutes',
    group: 'occasion',
    label: 'Movies under 90 minutes',
    heading: 'Great movies under 90 minutes',
    title: 'Short Movies Under 90 Minutes Worth Watching',
    description: 'Highly rated movies that run 90 minutes or less. Find a short movie for a weeknight, ranked by audience score and listed without spoilers.',
    intro: [
      'Not every evening has room for a three-hour epic. Every film here runs between 60 and 90 minutes, so you can start one after dinner and still get to bed on time.',
      'Each film has been rated by at least 1,000 people on TMDb. The list mixes genres, so check the genre tags and vibe profile on a movie page to find the right mood.',
    ],
    method: 'Ranked by TMDb audience score among films with a runtime of 60 to 90 minutes and at least 1,000 votes. The list refreshes daily.',
    spoilerTip: 'A two-minute trailer covers more of a short film than of a long one. With short films especially, the less you see beforehand, the more of the film stays new.',
    questions: [
      {
        question: 'How long is a typical movie?',
        answer: 'Most feature films run between 90 minutes and two hours. Every movie page on NoSpoilers shows the runtime, so you can plan before you press play.',
      },
      {
        question: 'Are short movies lower quality?',
        answer: 'No. Every film here is highly rated by a large audience. A shorter runtime often means tighter pacing and less filler.',
      },
    ],
    related: ['best-comedy-movies', 'best-horror-movies', 'best-animated-movies'],
    query: highestRated(1_000, { 'with_runtime.gte': '60', 'with_runtime.lte': '90' }),
  },
  {
    slug: 'hidden-gem-movies',
    group: 'occasion',
    label: 'Hidden gem movies',
    heading: 'Hidden gem movies',
    title: 'Hidden Gem Movies: Underrated Films Worth Watching',
    description: 'Underrated movies with high audience scores and smaller audiences. Discover hidden gems you may have missed, listed without spoilers.',
    intro: [
      'A hidden gem is a film that the people who saw it loved, but that not many people have seen. These films have strong audience scores from a smaller number of viewers, so they are less likely to have been spoiled for you already.',
      'Because fewer people have rated them, scores here can move more than on the all-time lists. Use the movie page to check genre, runtime, and who a film suits, and save anything interesting to your watchlist.',
    ],
    method: 'Films rated 7 or higher on TMDb by between 100 and 2,000 people, with modest popularity, ranked by audience score. The list refreshes daily.',
    spoilerTip: 'Hidden gems are the easiest films to see unspoiled, because few people are talking about them. Enjoy the rare chance to start a film with no expectations at all.',
    questions: [
      {
        question: 'What makes a movie a hidden gem?',
        answer: 'Here, it means a film rated 7 or higher by audiences but rated by no more than 2,000 people on TMDb. It is well liked but not widely seen.',
      },
      {
        question: 'Why does this list change?',
        answer: 'With smaller audiences, each new rating has more influence. The list refreshes daily, so titles can move in or out as ratings and popularity change.',
      },
    ],
    related: ['movies-to-watch-blind', 'best-documentaries', 'best-movies-of-all-time'],
    query: highestRated(100, {
      'vote_count.lte': '2000',
      'vote_average.gte': '7',
      'popularity.gte': '2',
      'popularity.lte': '35',
    }),
  },
  {
    slug: 'new-movies',
    group: 'occasion',
    label: 'New movies',
    heading: 'New movies to watch',
    title: 'New Movies to Watch: Recent Releases, Spoiler-Free',
    description: 'Popular movies released in the last 90 days, listed without spoilers. See which new releases people are watching and pick one for tonight.',
    intro: [
      'New releases are the films most likely to be spoiled. Reviews, social media, and friends all discuss them at once, so it is hard to stay unspoiled for long after release.',
      'Every film here was released in the last 90 days and is sorted by current popularity on TMDb. Some will be in theaters and others streaming. Each movie page shows viewing options when that information is available for your region.',
    ],
    method: 'Films released in the last 90 days with at least 40 TMDb votes and an audience score of 6 or higher, sorted by current popularity. The list refreshes daily.',
    spoilerTip: 'Most new-release spoilers spread through social feeds and comment sections in the first few weeks. Mute the title where your apps allow it, or use the NoSpoilers Shield browser extension to hide likely spoilers for films you add.',
    questions: [
      {
        question: 'How new are these movies?',
        answer: 'Every film here was first released within the last 90 days. The list refreshes daily, so older titles drop off as new ones arrive.',
      },
      {
        question: 'Where can I watch a new movie?',
        answer: 'It depends on the film and your country. Movie pages show viewing options when provider information is available for your region. Check the provider for current access and pricing.',
      },
    ],
    related: ['best-movies-of-all-time', 'hidden-gem-movies', 'best-thriller-movies'],
    query: today => ({
      ...BASE_QUERY,
      sort_by: 'popularity.desc',
      'vote_count.gte': '40',
      'vote_average.gte': '6',
      'primary_release_date.gte': daysBefore(today, 90),
      'primary_release_date.lte': today,
    }),
  },
]

const GUIDES_BY_SLUG = new Map(MOVIE_GUIDES.map(guide => [guide.slug, guide]))
const GUIDES_BY_GENRE = new Map(
  MOVIE_GUIDES.filter(guide => guide.genreId !== undefined).map(guide => [guide.genreId, guide]),
)

export function getMovieGuide(slug: string): MovieGuide | undefined {
  return GUIDES_BY_SLUG.get(slug)
}

export function getGuideForGenre(genreId: number): MovieGuide | undefined {
  return GUIDES_BY_GENRE.get(genreId)
}

export function guidePath(guide: Pick<MovieGuide, 'slug'>): string {
  return `/movie-recommendations/${guide.slug}`
}

/**
 * Keeps catalog results that can be shown and linked. Posters are not required:
 * a ranked list keeps its order, and the poster frame has a fallback.
 */
export function selectGuideMovies(movies: TMDbMovie[], now = new Date()): TMDbMovie[] {
  const seen = new Set<number>()
  const selected: TMDbMovie[] = []

  for (const movie of movies) {
    if (selected.length >= GUIDE_LIST_SIZE) break
    if (movie.adult || !Number.isSafeInteger(movie.id) || movie.id <= 0 || seen.has(movie.id)) continue
    if (!movie.title?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(movie.release_date ?? '')) continue
    if (Date.parse(`${movie.release_date}T00:00:00Z`) > now.getTime()) continue
    seen.add(movie.id)
    selected.push(movie)
  }

  return selected
}

export function utcDate(now = new Date()): string {
  return now.toISOString().slice(0, 10)
}
