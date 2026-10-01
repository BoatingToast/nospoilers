import { permanentRedirect } from 'next/navigation'

export default function LegacyFollowingPage() {
  permanentRedirect('/friends/following')
}
