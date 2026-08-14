export function requestClientKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || request.headers.get('cf-connecting-ip')?.trim()
    || 'unknown-client'
}

export function getClientIdentifier(request: Request): string {
  return `ip:${requestClientKey(request).slice(0, 128)}`
}
