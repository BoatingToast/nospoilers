import { permanentRedirect } from 'next/navigation'

// Alias — canonical URL is /friends/find
export default function FriendsDiscoverPage() {
  permanentRedirect('/friends/find')
}
