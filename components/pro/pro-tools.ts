import { ClapperboardIcon, LockIcon, MovieDnaIcon, RecsIcon, WatchlistIcon, FriendsIcon } from '@/components/icons'

export const PRO_TOOLS = [
  { slug: 'tonight', title: 'Tonight Mode', category: 'Find your next watch', description: 'Your time, your mood, one great pick from your watchlist.', action: 'Find my movie', Icon: WatchlistIcon },
  { slug: 'lumi', title: 'Lumi AI', category: 'Talk it through', description: 'Tell Lumi what you like. Get movie recommendations without the plot details.', action: 'Chat with Lumi', Icon: RecsIcon },
  { slug: 'identity', title: 'Identity Forge', category: 'Make it yours', description: 'Customize a 3D character with your choice of colors and accessories.', action: 'Open studio', Icon: MovieDnaIcon },
  { slug: 'double-feature', title: 'Double Feature', category: 'Make a night of it', description: 'Have time for two? Pair films from your watchlist by mood and runtime.', action: 'Pair two films', Icon: ClapperboardIcon },
  { slug: 'taste-lab', title: 'Taste Lab', category: 'Know your taste', description: 'See what your ratings reveal about your taste in film.', action: 'Explore my taste', Icon: FriendsIcon },
  { slug: 'spoiler-field', title: 'Spoiler Field', category: 'Stay in control', description: 'See which plot details are safe at each point in a film.', action: 'Explore boundaries', Icon: LockIcon },
] as const

export type ProTool = (typeof PRO_TOOLS)[number]

export function getProTool(slug: string) {
  return PRO_TOOLS.find(tool => tool.slug === slug)
}
