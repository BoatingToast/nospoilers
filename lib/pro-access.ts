const PRO_ACCESS_EMAILS = new Set([
  'emoon0108@gmail.com',
  'noahkaplan721@gmail.com',
])

export function hasProAccess(email: string | null | undefined): boolean {
  return PRO_ACCESS_EMAILS.has(email?.trim().toLowerCase() ?? '')
}
