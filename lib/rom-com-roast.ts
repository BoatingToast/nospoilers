import type { DNAScores } from '../types'

const ROMANCE_GENRE_ID = 10749
const COMEDY_GENRE_ID = 35

const DNA_KEYS: (keyof DNAScores)[] = [
  'suspenseScore',
  'emotionalImpactScore',
  'complexityScore',
  'humorScore',
  'realismScore',
  'actionScore',
  'darknessScore',
]

const DNA_LABELS: Record<keyof DNAScores, string> = {
  suspenseScore:        'Suspense',
  emotionalImpactScore: 'Emotion',
  complexityScore:      'Complexity',
  humorScore:           'Humor',
  realismScore:         'Realism',
  actionScore:          'Action',
  darknessScore:        'Darkness',
}

// A rom-com match should care most about humor and emotion. The other DNA
// dimensions still matter, but they do not get to overpower the genre's core.
const ROM_COM_WEIGHTS: Record<keyof DNAScores, number> = {
  suspenseScore:        0.55,
  emotionalImpactScore: 1.6,
  complexityScore:      0.9,
  humorScore:           1.7,
  realismScore:         1.15,
  actionScore:          0.45,
  darknessScore:        0.75,
}

type RoastTheme =
  | 'antagonism'
  | 'communication'
  | 'deception'
  | 'delusion'
  | 'grand-gesture'
  | 'red-flags'
  | 'slow-burn'
  | 'workplace'
  | 'yearning'

interface RoastLine {
  text: string
  themes: RoastTheme[]
}

// A large, categorized bank lets a title-aware deterministic picker keep a
// result stable enough to share without turning every movie into the same
// fortune cookie with a different poster.
const ROAST_LINES: RoastLine[] = [
  { text: 'Your type is emotionally unavailable with good lighting.', themes: ['red-flags', 'yearning'] },
  { text: 'You don’t want love. You want a third-act misunderstanding.', themes: ['communication', 'delusion'] },
  { text: 'Your standards were set by people who communicate exclusively through grand gestures.', themes: ['grand-gesture', 'communication'] },
  { text: 'You think arguing is chemistry.', themes: ['antagonism'] },
  { text: 'You call it enemies-to-lovers. Everyone else calls it a hostile work environment.', themes: ['antagonism', 'workplace'] },
  { text: 'Your love language is ignoring obvious red flags because he’s charming.', themes: ['red-flags', 'delusion'] },
  { text: 'You’d forgive anything if it happened in the rain.', themes: ['grand-gesture', 'delusion'] },
  { text: 'You don’t need a boyfriend. You need a screenwriter.', themes: ['delusion'] },
  { text: 'You think stalking is romantic if there’s an indie song playing.', themes: ['red-flags', 'delusion'] },
  { text: 'Your dating strategy is “make terrible decisions until the soundtrack kicks in.”', themes: ['deception', 'delusion'] },
  { text: 'You’ve mistaken emotional whiplash for butterflies.', themes: ['red-flags', 'yearning'] },
  { text: 'You want someone toxic, but like…cinematically toxic.', themes: ['red-flags', 'delusion'] },
  { text: 'Your ideal relationship starts with fraud.', themes: ['deception'] },
  { text: 'You think lying about your identity is cute if the chemistry is good.', themes: ['deception'] },
  { text: 'You’d ruin your life for a man with a British accent and one vulnerable scene.', themes: ['yearning', 'red-flags'] },
  { text: 'Your soulmate apparently needs to insult you for 45 minutes first.', themes: ['antagonism'] },
  { text: 'You’ve never met a red flag you couldn’t romanticize.', themes: ['red-flags'] },
  { text: 'You call it slow burn because “terrible communication” sounds less cute.', themes: ['slow-burn', 'communication'] },
  { text: 'Your favorite couples would not survive one shared Google Calendar.', themes: ['communication', 'workplace'] },
  { text: 'You think “he remembers one tiny detail” is a personality.', themes: ['yearning'] },
  { text: 'You’d marry someone based on one airport sprint.', themes: ['grand-gesture'] },
  { text: 'Your relationship standards are 30% banter, 70% delusion.', themes: ['antagonism', 'delusion'] },
  { text: 'You don’t want stability. You want tension.', themes: ['antagonism', 'red-flags'] },
  { text: 'Your dream man is one misunderstanding away from ruining your week.', themes: ['communication', 'red-flags'] },
  { text: 'You believe every emotionally constipated man deserves a redemption arc.', themes: ['communication', 'yearning'] },
  { text: 'You want a meet-cute so badly you’d probably get hit by a taxi on purpose.', themes: ['delusion'] },
  { text: 'You think jealousy is flirting with better cinematography.', themes: ['red-flags'] },
  { text: 'Your romantic type is “problematic, but tall.”', themes: ['red-flags'] },
  { text: 'You’d ignore six red flags for one forehead kiss.', themes: ['red-flags', 'yearning'] },
  { text: 'You don’t fall in love. You develop a subplot.', themes: ['delusion'] },
  { text: 'You think being mean is foreplay.', themes: ['antagonism'] },
  { text: 'Your standards collapse the second someone says your name softly.', themes: ['yearning'] },
  { text: 'You’d forgive tax fraud if he showed up at the airport.', themes: ['deception', 'grand-gesture'] },
  { text: 'You think “we hate each other” is just foreplay with paperwork.', themes: ['antagonism', 'workplace'] },
  { text: 'You’re one montage away from making a terrible life decision.', themes: ['delusion'] },
  { text: 'Your perfect man is unavailable until minute 87.', themes: ['slow-burn', 'yearning'] },
  { text: 'You think emotional maturity ruins the plot.', themes: ['communication', 'red-flags'] },
  { text: 'You’d rather have banter than peace.', themes: ['antagonism'] },
  { text: 'Your romantic expectations were built by people with rent-controlled Manhattan apartments.', themes: ['delusion'] },
  { text: 'You think a bouquet can fix structural relationship issues.', themes: ['grand-gesture', 'communication'] },
  { text: 'You’ve watched so many rom-coms you think coincidence is a dating app.', themes: ['delusion'] },
  { text: 'You need chemistry so badly you’re willing to overlook basic compatibility.', themes: ['red-flags', 'yearning'] },
  { text: 'You’d date a walking red flag if he had good cheekbones.', themes: ['red-flags'] },
  { text: 'You think “complicated” means “destined.”', themes: ['red-flags', 'yearning'] },
  { text: 'Your idea of romance is two people refusing to communicate for 90 minutes.', themes: ['communication'] },
  { text: 'You want someone who “challenges you,” apparently by making your life harder.', themes: ['antagonism', 'red-flags'] },
  { text: 'You don’t want closure. You want a sequel.', themes: ['yearning', 'delusion'] },
  { text: 'Your dating life has too many tropes and not enough therapy.', themes: ['red-flags', 'delusion'] },
  { text: 'You think mutual annoyance is a solid foundation for marriage.', themes: ['antagonism'] },
  { text: 'Your soulmate better have excellent timing and no conflict-resolution skills.', themes: ['communication', 'grand-gesture'] },
  { text: 'You’ve confused emotional damage with character development.', themes: ['red-flags'] },
  { text: 'You think one vulnerable confession cancels out 80 minutes of nonsense.', themes: ['communication', 'yearning'] },
  { text: 'Your type is “would be unbearable in real life.”', themes: ['red-flags', 'delusion'] },
  { text: 'You treat red flags like bonus features.', themes: ['red-flags'] },
  { text: 'You want love at first sight but somehow also a 90-minute slow burn.', themes: ['slow-burn', 'delusion'] },
  { text: 'You’d risk your career for a man you met three scenes ago.', themes: ['workplace', 'delusion'] },
  { text: 'You think every terrible first impression deserves another 12 chances.', themes: ['antagonism', 'red-flags'] },
  { text: 'Your favorite couples communicate entirely through eye contact and poor decisions.', themes: ['communication', 'delusion'] },
  { text: 'You don’t want a relationship. You want a cinematic universe.', themes: ['delusion'] },
  { text: 'Your attachment style is “available on streaming.”', themes: ['yearning', 'delusion'] },
  { text: 'You think one dance scene can repair anything.', themes: ['grand-gesture'] },
  { text: 'You’d absolutely date your boss if the soundtrack was good enough.', themes: ['workplace', 'red-flags'] },
  { text: 'You have the romantic judgment of a 2003 screenplay.', themes: ['delusion'] },
  { text: 'Your biggest red flag is thinking red flags are plot development.', themes: ['red-flags'] },
  { text: 'You’re not looking for Mr. Right. You’re looking for Mr. Makes-Good-Content.', themes: ['delusion'] },
  { text: 'You want someone who ruins your peace but improves your Letterboxd.', themes: ['red-flags'] },
  { text: 'You’ve built an entire romantic philosophy around people who could’ve solved everything with one text.', themes: ['communication'] },
  { text: 'You think “wrong person, right time” is profound instead of inconvenient.', themes: ['yearning'] },
  { text: 'You’d choose sparks over compatibility every single time.', themes: ['red-flags', 'yearning'] },
  { text: 'Your ideal relationship begins with mutual contempt and ends with public humiliation.', themes: ['antagonism', 'grand-gesture'] },
  { text: 'You believe true love means never having to communicate clearly.', themes: ['communication'] },
  { text: 'You want your boyfriend to have layers. Unfortunately, most of them are red flags.', themes: ['red-flags'] },
  { text: 'You’re emotionally invested in people who would get blocked in real life.', themes: ['red-flags', 'yearning'] },
  { text: 'Your relationship goals require a suspicious amount of public declarations.', themes: ['grand-gesture'] },
  { text: 'You’d rather be confused for 80 minutes than date someone emotionally healthy.', themes: ['communication', 'red-flags'] },
  { text: 'You don’t have a type. You have a recurring narrative mistake.', themes: ['red-flags', 'delusion'] },
  { text: 'Your taste in men is basically “needs fixing, looks expensive.”', themes: ['red-flags'] },
  { text: 'You see a commitment issue and call it a character arc.', themes: ['red-flags', 'yearning'] },
  { text: 'You want butterflies, but you keep choosing food poisoning.', themes: ['red-flags'] },
  { text: 'Your rom-com DNA is 50% delusion, 30% yearning, 20% ignoring obvious warning signs.', themes: ['delusion', 'yearning', 'red-flags'] },
  { text: 'You think “he’s complicated” is a compliment.', themes: ['red-flags'] },
  { text: 'You’d let one good monologue erase a season’s worth of bad behavior.', themes: ['grand-gesture', 'red-flags'] },
  { text: 'Your dream romance could be prevented by basic communication.', themes: ['communication'] },
  { text: 'You love a slow burn because apparently happiness arriving on time is boring.', themes: ['slow-burn', 'yearning'] },
  { text: 'You don’t want healthy love. You want quotable love.', themes: ['delusion', 'yearning'] },
  { text: 'Your taste says therapy, but your watchlist says absolutely not.', themes: ['red-flags'] },
  { text: 'You think a makeover is a legitimate relationship milestone.', themes: ['delusion'] },
  { text: 'You’ve mistaken sexual tension for long-term compatibility.', themes: ['antagonism', 'red-flags'] },
  { text: 'You would survive exactly four minutes in your favorite rom-com.', themes: ['delusion'] },
  { text: 'Your relationship expectations have a production budget.', themes: ['grand-gesture', 'delusion'] },
  { text: 'You want someone to fight for you, mostly because talking things out would be less dramatic.', themes: ['antagonism', 'communication'] },
  { text: 'Your romantic compass points directly toward bad decisions.', themes: ['red-flags', 'delusion'] },
  { text: 'You think chaos is chemistry with better branding.', themes: ['antagonism', 'red-flags'] },
]

// Signature banks guarantee that iconic titles with different premises do not
// collide even when the same viewer opens them back-to-back.
const TITLE_ROASTS: Record<string, string[]> = {
  '10 things i hate about you': [
    'You think being mean is foreplay.',
    'Your soulmate apparently needs to insult you for 45 minutes first.',
    'You think mutual annoyance is a solid foundation for marriage.',
    'You’d rather have banter than peace.',
  ],
  'how to lose a guy in 10 days': [
    'Your ideal relationship starts with fraud.',
    'Your dating strategy is “make terrible decisions until the soundtrack kicks in.”',
    'You think lying about your identity is cute if the chemistry is good.',
    'You’re one montage away from making a terrible life decision.',
  ],
  'when harry met sally...': [
    'You want love at first sight but somehow also a 90-minute slow burn.',
    'You love a slow burn because apparently happiness arriving on time is boring.',
  ],
  'the proposal': [
    'You’d forgive tax fraud if he showed up at the airport.',
    'Your ideal relationship starts with fraud.',
  ],
  'love actually': [
    'Your relationship goals require a suspicious amount of public declarations.',
    'Your standards were set by people who communicate exclusively through grand gestures.',
  ],
  'crazy rich asians': [
    'Your taste in men is basically “needs fixing, looks expensive.”',
    'Your relationship expectations have a production budget.',
  ],
  'you’ve got mail': [
    'Your dream romance could be prevented by basic communication.',
    'You think lying about your identity is cute if the chemistry is good.',
  ],
  "you've got mail": [
    'Your dream romance could be prevented by basic communication.',
    'You think lying about your identity is cute if the chemistry is good.',
  ],
}

const TITLE_THEME_RULES: { pattern: RegExp; theme: RoastTheme }[] = [
  { pattern: /hate|enemy|enemies|rival|battle|war of/i, theme: 'antagonism' },
  { pattern: /lose|lie|liar|fake|pretend|proposal/i, theme: 'deception' },
  { pattern: /office|boss|assistant|work|business/i, theme: 'workplace' },
  { pattern: /wedding|marry|bride|groom/i, theme: 'grand-gesture' },
  { pattern: /wait|eventually|forever|years|time/i, theme: 'slow-burn' },
]

const KEYWORD_THEME_RULES: { needles: string[]; theme: RoastTheme }[] = [
  { needles: ['enemies to lovers', 'rivalry', 'rivals', 'love hate relationship'], theme: 'antagonism' },
  { needles: ['fake relationship', 'false identity', 'mistaken identity', 'deception', 'lie'], theme: 'deception' },
  { needles: ['office romance', 'workplace romance', 'boss', 'coworker', 'co-worker'], theme: 'workplace' },
  { needles: ['wedding', 'marriage', 'airport', 'public declaration'], theme: 'grand-gesture' },
  { needles: ['love triangle', 'jealousy', 'infidelity', 'toxic relationship'], theme: 'red-flags' },
  { needles: ['unrequited love', 'longing', 'pining'], theme: 'yearning' },
  { needles: ['friends to lovers', 'slow burn', 'childhood friends'], theme: 'slow-burn' },
]

export interface RomComRoastInput {
  tmdbId: number
  title: string
  genreIds: number[]
  keywords?: string[]
  releaseDate?: string | null
  runtime?: number | null
  userDNA: DNAScores
  movieDNA: DNAScores
}

export interface RomComRoastResult {
  matchScore: number
  roast: string
  verdict: string
  strongestMatch: string
  biggestMismatch: string
}

export function isRomComMovie(genreIds: number[]): boolean {
  return genreIds.includes(ROMANCE_GENRE_ID) && genreIds.includes(COMEDY_GENRE_ID)
}

export function buildRomComRoast(input: RomComRoastInput): RomComRoastResult {
  if (!isRomComMovie(input.genreIds)) {
    throw new Error('Rom-Com DNA roasts require both Romance and Comedy genres.')
  }

  const comparisons = DNA_KEYS.map(key => ({
    key,
    difference: Math.abs(input.userDNA[key] - input.movieDNA[key]),
  }))
  const totalWeight = DNA_KEYS.reduce((sum, key) => sum + ROM_COM_WEIGHTS[key], 0)
  const weightedDifference = comparisons.reduce(
    (sum, comparison) => sum + comparison.difference * ROM_COM_WEIGHTS[comparison.key],
    0,
  ) / totalWeight
  const matchScore = Math.max(0, Math.min(100, Math.round(100 - (weightedDifference / 9) * 100)))

  const strongestMatch = [...comparisons]
    .sort((a, b) => a.difference - b.difference || DNA_KEYS.indexOf(a.key) - DNA_KEYS.indexOf(b.key))[0]
  const biggestMismatch = [...comparisons]
    .sort((a, b) => b.difference - a.difference || DNA_KEYS.indexOf(a.key) - DNA_KEYS.indexOf(b.key))[0]

  const normalizedTitle = input.title.toLocaleLowerCase('en-US').trim()
  const titleRoasts = TITLE_ROASTS[normalizedTitle]
  const seed = roastSeed(input)
  const theme = chooseTheme(input, biggestMismatch.key)
  const themedRoasts = ROAST_LINES.filter(line => line.themes.includes(theme))
  const roast = titleRoasts?.length
    ? titleRoasts[seed % titleRoasts.length]
    : themedRoasts[seed % themedRoasts.length]?.text ?? ROAST_LINES[seed % ROAST_LINES.length].text

  return {
    matchScore,
    roast,
    verdict: verdictFor(input.title, matchScore),
    strongestMatch: DNA_LABELS[strongestMatch.key],
    biggestMismatch: DNA_LABELS[biggestMismatch.key],
  }
}

function chooseTheme(input: RomComRoastInput, biggestMismatch: keyof DNAScores): RoastTheme {
  const titleRule = TITLE_THEME_RULES.find(rule => rule.pattern.test(input.title))
  if (titleRule) return titleRule.theme

  const keywords = (input.keywords ?? []).map(keyword => keyword.toLocaleLowerCase('en-US'))
  const keywordRule = KEYWORD_THEME_RULES.find(rule =>
    rule.needles.some(needle => keywords.some(keyword => keyword.includes(needle))),
  )
  if (keywordRule) return keywordRule.theme

  if ((input.runtime ?? 0) >= 125) return 'slow-burn'
  if (biggestMismatch === 'realismScore' || input.userDNA.realismScore <= 4.5) return 'delusion'
  if (biggestMismatch === 'complexityScore') return 'communication'
  if (input.userDNA.darknessScore >= 6.5) return 'red-flags'
  if (input.userDNA.emotionalImpactScore >= 7) return 'grand-gesture'
  if (input.userDNA.humorScore >= 6.5) return 'antagonism'
  return input.userDNA.emotionalImpactScore >= input.userDNA.realismScore ? 'yearning' : 'communication'
}

function verdictFor(title: string, matchScore: number): string {
  if (matchScore >= 90) return `${title} reviewed your romantic judgment. It found no notes, which is concerning.`
  if (matchScore >= 75) return `${title} reviewed your standards. Unfortunately, it meets them.`
  if (matchScore >= 55) return `${title} sees chemistry. Your DNA sees a manageable warning label.`
  return `${title} would like to stay friends. Your DNA is already writing the sequel.`
}

function roastSeed(input: RomComRoastInput): number {
  const dnaFingerprint = DNA_KEYS.map(key => input.userDNA[key].toFixed(1)).join('|')
  const source = `${input.tmdbId}|${input.title}|${input.releaseDate ?? ''}|${dnaFingerprint}`
  let hash = 2166136261

  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}
