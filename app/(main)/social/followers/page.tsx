import { permanentRedirect } from 'next/navigation'

export default function LegacyFollowersPage() {
  permanentRedirect('/friends/followers')
}
