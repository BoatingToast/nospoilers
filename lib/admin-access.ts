// A database grant AND this exact allowlist are required. Pro access does not
// confer administration. The grant is never accepted from a client session update.
export const ADMIN_EMAIL = 'emoon0108@gmail.com'

export function isAdminEmail(email: string | null | undefined) {
  return email?.trim().toLowerCase() === ADMIN_EMAIL
}

export function hasAdminAccess(
  user: { email?: string | null; isAdmin?: boolean } | null | undefined,
) {
  return Boolean(user?.isAdmin && isAdminEmail(user.email))
}
