const PRO_ACCESS_EMAIL = 'emoon0108@gmail.com'

export function hasProAccess(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === PRO_ACCESS_EMAIL
}
