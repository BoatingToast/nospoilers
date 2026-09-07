import type { Metadata } from 'next'
import TheaterLobby from '@/components/theater/TheaterLobby'

export const metadata: Metadata = { title: 'NoSpoilers Theater — Be there for the first frame', description: 'Discover independent films and trailers together in an immersive 3D premiere theater.' }

export default function TheaterPage() { return <TheaterLobby /> }
