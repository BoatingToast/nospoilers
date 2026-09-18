import { publicPageMetadata } from '@/lib/seo'
import TheaterLobby from '@/components/theater/TheaterLobby'

export const metadata = publicPageMetadata({
  title: 'Theater — Independent Film Premieres',
  description: 'Discover independent films and trailers together in the NoSpoilers 3D premiere theater. Explore the lobby and upcoming screenings.',
  path: '/theater',
})

export default function TheaterPage() { return <TheaterLobby /> }
