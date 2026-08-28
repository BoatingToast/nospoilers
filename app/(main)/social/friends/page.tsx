import { permanentRedirect } from 'next/navigation'

export default function LegacyFriendsPage() {
  permanentRedirect('/friends')
}
