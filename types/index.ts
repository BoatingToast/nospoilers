// ─── TMDb ────────────────────────────────────────────────────────────────────

export interface TMDbMovie {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  vote_count: number
  genre_ids: number[]
  popularity: number
  original_language: string
}

export interface TMDbMovieDetail {
  id: number
  title: string
  overview: string
  poster_path: string | null
  backdrop_path: string | null
  release_date: string
  vote_average: number
  vote_count: number
  genre_ids: number[]
  popularity: number
  original_language: string
  runtime: number | null
  genres: { id: number; name: string }[]
  tagline: string | null
  status: string
  budget: number
  revenue: number
  production_companies: { id: number; name: string; logo_path: string | null }[]
  production_countries?: { iso_3166_1: string; name: string }[]
}

export interface TMDbCastMember {
  id: number
  name: string
  character: string
  profile_path: string | null
  order: number
}

export interface TMDbCrewMember {
  id: number
  name: string
  job: string
  department: string
  profile_path: string | null
}

export interface TMDbCredits {
  id: number
  cast: TMDbCastMember[]
  crew: TMDbCrewMember[]
}

export interface TMDbPerson {
  id: number
  name: string
  profile_path: string | null
  known_for_department: string
  known_for: TMDbMovie[]
  media_type: 'person'
}

export interface TMDbSearchResponse {
  page: number
  results: TMDbMovie[]
  total_pages: number
  total_results: number
}

export interface TMDbMultiSearchResponse {
  page: number
  results: Array<(TMDbMovie & { media_type: 'movie' }) | (TMDbPerson & { media_type: 'person' })>
  total_pages: number
  total_results: number
}

// ─── User / Profile ───────────────────────────────────────────────────────────

export interface SafeUser {
  id:        string
  email:     string
  username:  string
  avatarUrl: string | null
  createdAt: Date
}

export interface FavoriteMovie {
  id: string
  tmdbId: number
  title: string
  posterPath: string | null
  addedAt: Date
}

export interface OnboardingMovieInput {
  tmdbId: number
  title: string
  posterPath: string | null
  releaseDate: string | null
  genreIds: number[]
}

export interface PreferencesInput {
  genres: string[]
  pacing: string
  endings: string
  storytelling: string
  tone: string
  complexity: number
  plotTwists: number
}

export interface DNAScores {
  suspenseScore: number
  emotionalImpactScore: number
  complexityScore: number
  humorScore: number
  realismScore: number
  actionScore: number
  darknessScore: number
}

export interface RecommendationItem {
  id: string
  tmdbId: number
  title: string
  posterPath: string | null
  releaseDate: string | null
  matchScore: number
  explanation: string
  feedback?: string | null
}

// ─── Recommendation Engine 2.0 ────────────────────────────────────────────────

export interface RecAccuracy {
  total:        number
  loved:        number    // feedback = 'liked'
  accepted:     number    // feedback = 'watched'
  dismissed:    number    // feedback = 'dismissed'
  notForMe:     number    // feedback = 'not_interested'
  accuracyPct:  number    // (loved + accepted) / total * 100
}

export interface RecPersona {
  id:          string       // stable slug, e.g. "like-interstellar"
  title:       string       // "Movies That Feel Like Interstellar"
  icon:        string       // emoji
  description: string       // short subtitle
  movies:      EnrichedRecForPersona[]
}

// Slim rec used inside personas (avoids re-exporting full EnrichedRec from curated-recs)
export interface EnrichedRecForPersona {
  tmdbId:      number
  title:       string
  posterPath:  string | null
  releaseDate: string | null
  matchScore:  number
  explanation: string
}

// ─── Phase 4: Personality + Social ───────────────────────────────────────────

export type PersonalitySlug =
  | 'thinker'
  | 'thriller-seeker'
  | 'explorer'
  | 'story-analyst'
  | 'entertainer'
  | 'auteur'
  | 'escapist'

export interface PersonalityType {
  slug:        PersonalitySlug
  name:        string
  description: string
  icon:        string
  color:       string
  accentHex:   string
  traits:      string[]
}

export interface UserPersonalityData {
  primaryType:   PersonalityType
  secondaryType: PersonalityType | null
  assignedAt:    string
}

export interface PublicProfile {
  id:               string
  username:         string
  avatarUrl:        string | null
  displayName:      string | null
  bio:              string | null
  location:         string | null
  favoriteDecade:   string | null
  favoriteDirector: string | null
  favoriteActor:    string | null
  twitterUrl:       string | null
  letterboxdUrl:    string | null
  instagramUrl:     string | null
  createdAt:        string
  personality:      UserPersonalityData | null
  dnaScores:        DNAScores | null
  favoriteMovies:   { tmdbId: number; title: string; posterPath: string | null }[]
  favoriteGenres:   string[]
  followerCount:    number
  followingCount:   number
  recommendationCount: number
}

export interface CompatibilityResult {
  score:          number
  reasons:        string[]
  insight:        string
  sharedMovies:   { tmdbId: number; title: string; posterPath: string | null }[]
  sharedGenres:   string[]
  dnaDiff:        Record<keyof DNAScores, { you: number; them: number; diff: number }>
}

export interface ActivityEventItem {
  id:        string
  type:      string
  data:      Record<string, unknown>
  createdAt: string
}

export interface SimilarUserPreview {
  id:             string
  username:       string
  avatarUrl:      string | null
  personality:    PersonalityType | null
  compatScore:    number
  sharedMovies:   number
  followerCount:  number
  isFollowing:    boolean
}

// ─── Phase 5: Watchlist, Collections, Achievements, XP, Wrapped ──────────────

export type WatchStatus = 'want_to_watch' | 'watching' | 'watched'

export interface WatchlistItemData {
  id:          string
  tmdbId:      number
  title:       string
  posterPath:  string | null
  releaseDate: string | null
  status:      WatchStatus
  rating:      number | null
  rewatchCount: number
  notes:       string | null
  watchedAt:   string | null
  addedAt:     string
  matchScore:  number | null
  voteAverage: number | null
  genreIds:    number[]
}

export interface CollectionData {
  id:          string
  userId:      string
  username:    string
  title:       string
  description: string | null
  coverPath:   string | null
  isPublic:    boolean
  movieCount:  number
  movies:      CollectionMovieData[]
  createdAt:   string
}

export interface CollectionMovieData {
  id:          string
  tmdbId:      number
  title:       string
  posterPath:  string | null
  releaseDate: string | null
  addedAt:     string
  position:    number
}

// ─── Phase 7: Collection Community ───────────────────────────────────────────

export type VoteType = 'upvote' | 'downvote'

export interface CollectionVoteData {
  id:           string
  userId:       string
  collectionId: string
  voteType:     VoteType
  createdAt:    string
}

export interface CollectionAnalyticsData {
  collectionId:    string
  views:           number
  saves:           number
  upvotes:         number
  downvotes:       number
  score:           number
  popularityScore: number
}

/** CollectionData enriched with community stats + the viewing user's vote */
export interface EnrichedCollectionData extends CollectionData {
  upvotes:         number
  downvotes:       number
  score:           number
  popularityScore: number
  views:           number
  userVote:        VoteType | null
}

export interface VoteResult {
  upvotes:  number
  downvotes: number
  score:    number
  userVote: VoteType | null
}

export type CollectionTab   = 'trending' | 'popular' | 'newest' | 'most_upvoted' | 'following'
export type CollectionSort  = 'highest_rated' | 'most_movies' | 'newest' | 'oldest'

export interface CreatorAnalytics {
  totalCollections: number
  totalUpvotes:     number
  totalDownvotes:   number
  totalViews:       number
  netScore:         number
  topCollections:   Array<{ id: string; title: string; upvotes: number; score: number; movieCount: number }>
  topMovies:        Array<{ tmdbId: number; title: string; posterPath: string | null; count: number }>
}

export interface CollectionSuggestion {
  id:       string
  title:    string
  username: string
}

export type AchievementCategory = 'watching' | 'genres' | 'discovery' | 'collections' | 'social'
export type AchievementRarity   = 'common' | 'rare' | 'epic' | 'legendary'

export interface Achievement {
  slug:        string
  name:        string
  description: string
  icon:        string
  goal:        number
  xpReward:    number
  category:    AchievementCategory
  rarity:      AchievementRarity
}

export interface UserAchievementData extends Achievement {
  progress:  number
  earned:    boolean
  earnedAt:  string | null
}

export interface XPLevel {
  level:      number
  title:      string
  minXP:      number
  maxXP:      number
  currentXP:  number
  totalXP:    number
  progress:   number // 0-100 percentage to next level
}

export interface WrappedData {
  year:             number
  moviesWatched:    number
  topGenres:        string[]
  topMovies:        { tmdbId: number; title: string; posterPath: string | null }[]
  totalWatchTime:   number | null // minutes
  topDecade:        string | null
  personalityType:  string | null
  topTrait:         string | null
  achievementsEarned: number
  hiddenGemsFound:  number
  followersGained:  number
  dnaSnapshot:      DNAScores | null
  generatedAt:      string
}

// ─── Phase 6: Ratings ─────────────────────────────────────────────────────────

export interface MovieRatingData {
  id:           string
  tmdbId:       number
  title:        string
  posterPath:   string | null
  releaseDate:  string | null
  /** Overall rating 1–100. Always set by the user — never computed from dimensions. */
  score:        number
  /** Advanced dimension ratings 1–10. Descriptive metadata only — never affect score. */
  storytelling: number | null
  characters:   number | null
  entertainment:number | null
  emotion:      number | null
  complexity:   number | null
  suspense:     number | null
  review:       string | null
  createdAt:    string
  updatedAt:    string
}

export interface RatingStats {
  totalRatings:     number
  averageScore:     number
  distribution:     Record<string, number> // bucket → count: '1-20','21-40','41-60','61-80','81-100'
  perfectScores:    number                 // count of score === 100
  averageSubRatings: {
    storytelling:   number | null
    characters:     number | null
    entertainment:  number | null
    emotion:        number | null
    complexity:     number | null
    suspense:       number | null
  }
  topRatedMovies: { tmdbId: number; title: string; posterPath: string | null; score: number }[]
  recentRatings:  { tmdbId: number; title: string; posterPath: string | null; score: number; createdAt: string }[]
}

// ─── Phase 8a: Friends & Social ───────────────────────────────────────────────

export type FriendStatus = 'none' | 'pending_sent' | 'pending_received' | 'friends'

export interface FriendSummary {
  id:          string
  username:    string
  avatarUrl:   string | null
  createdAt:   string
  personality: string | null
}

export interface PendingRequest {
  id:        string
  username:  string
  sentAt:    string
  requestId: string
}

export interface FriendFeedItem {
  id:              string
  type:            string
  data:            Record<string, unknown>
  createdAt:       string
  authorUsername:  string
  authorAvatarUrl: string | null
}

export interface FriendRec {
  tmdbId:       number
  title:        string
  posterPath:   string | null
  matchScore:   number
  friendRatings: { username: string; score: number }[]
  explanation:  string
}

// ─── DNA Evolution + Rating-Based Recs ───────────────────────────────────────

export interface DnaEvolution {
  /** Current DNA values */
  current: DNAScores
  /** Previous DNA snapshot (null if no snapshot yet) */
  previous: DNAScores | null
  /** Per-dimension deltas (current − previous). Empty if no previous. */
  deltas: Partial<Record<keyof DNAScores, number>>
  /** How many ratings were used in the last recalc */
  ratingCount: number
  /** When the snapshot was taken */
  snapshotAt: string | null
  /** Recent high-rated movies that most influenced the DNA */
  topInfluencers: { tmdbId: number; title: string; posterPath: string | null; score: number }[]
}

/** A recommendation driven by the user's rating history */
export interface RatingRec {
  tmdbId:      number
  title:       string
  posterPath:  string | null
  releaseDate: string | null
  matchScore:  number  // 0-100
  /** Why this was recommended — anchored to specific rated films */
  because:     { tmdbId: number; title: string; score: number }[]
  explanation: string
}

// ─── Spoiler Zone ─────────────────────────────────────────────────────────────

/** Which tab a message (or the active view) belongs to */
export type SpoilerLevel = 'safe' | 'mid' | 'ending' | 'theory' | 'behind'

export interface SZReactionGroup {
  emoji:       string
  count:       number
  userReacted: boolean
}

export interface SZMessageData {
  id:            string
  tmdbId:        number
  userId:        string
  username:      string
  avatarUrl:     string | null
  content:       string
  editedAt:      string | null
  isDeleted:     boolean
  isTheory:      boolean
  spoilerLevel:  SpoilerLevel
  parentId:      string | null
  parentPreview: { id: string; username: string; content: string } | null
  isPinned:      boolean
  pinnedLabel:   string | null
  voteScore:     number
  userVote:      'upvote' | 'downvote' | null
  reactions:     SZReactionGroup[]
  replyCount:    number
  createdAt:     string
}

export interface SZRoomStats {
  memberCount:  number
  messageCount: number
  onlineCount:  number  // populated from Supabase Presence
}

export interface SZMembership {
  id:                   string
  tmdbId:               number
  movieTitle:           string
  moviePoster:          string | null
  memberCount:          number
  messageCount:         number
  unreadCount:          number
  lastActivity:         string | null  // ISO string of most recent message
  joinedAt:             string
  pinned:               boolean
  pinnedAt:             string | null
  notificationsEnabled: boolean
  /** True if a message was posted in the last 30 min */
  isActive:             boolean
}

/** Lightweight preview data fetched on card hover */
export interface SZPreview {
  messages: {
    id:        string
    username:  string
    avatarUrl: string | null
    content:   string
    createdAt: string
    isTheory:  boolean
  }[]
  latestTheory: {
    id:        string
    username:  string
    content:   string
    createdAt: string
  } | null
  onlineCount: number
}

// ─── NextAuth augmentation ────────────────────────────────────────────────────

declare module 'next-auth' {
  interface Session {
    user: {
      id:                  string
      email:               string
      name:                string
      image:               string | null
      onboardingCompleted: boolean
    }
  }
  interface User {
    id:    string
    image: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id:                  string
    image:               string | null
    onboardingCompleted: boolean
  }
}
