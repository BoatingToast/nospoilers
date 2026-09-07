import type { Metadata } from 'next'
import CreatePremiere from '@/components/theater/CreatePremiere'

export const metadata: Metadata = { title: 'Host a premiere — NoSpoilers Theater' }
export default function NewPremierePage() { return <CreatePremiere /> }
