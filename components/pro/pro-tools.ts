import { ClapperboardIcon, LockIcon, MovieDnaIcon, RecsIcon, WatchlistIcon, FriendsIcon } from '@/components/icons'

export const PRO_TOOLS = [
  { slug: 'tonight', title: 'Tonight Mode', category: 'Find your next watch', description: 'Your time, your mood, one great pick from your watchlist.', action: 'Find my movie', Icon: WatchlistIcon },
  { slug: 'lumi', title: 'Lumi AI', category: 'Talk it through', description: 'A little indecisive? Talk movies with your spoiler-free companion.', action: 'Chat with Lumi', Icon: RecsIcon },
  { slug: 'identity', title: 'Identity Forge', category: 'Make it yours', description: 'Create and customize your own 3D cinema identity.', action: 'Open studio', Icon: MovieDnaIcon },
  { slug: 'double-feature', title: 'Double Feature', category: 'Make a night of it', description: 'Pair two films into a night that fits your time and mood.', action: 'Build a double feature', Icon: ClapperboardIcon },
  { slug: 'taste-lab', title: 'Taste Lab', category: 'Know your taste', description: 'Explore the patterns behind the movies you love.', action: 'Explore my taste', Icon: FriendsIcon },
  { slug: 'spoiler-field', title: 'Spoiler Field', category: 'Stay in control', description: 'Explore how spoiler boundaries change with your progress.', action: 'Explore boundaries', Icon: LockIcon },
] as const

export type ProTool = (typeof PRO_TOOLS)[number]

export function getProTool(slug: string) {
  return PRO_TOOLS.find(tool => tool.slug === slug)
}
