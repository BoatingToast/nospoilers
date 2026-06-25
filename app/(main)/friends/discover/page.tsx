import { redirect } from 'next/navigation'

// Alias — canonical URL is /friends/find
export default function FriendsDiscoverPage() {
  redirect('/friends/find')
}
