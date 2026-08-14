export function redactLockedText(content: string, viewerUnlocked: boolean): string {
  return viewerUnlocked ? content : ''
}

export function redactLockedOptionalText(
  content: string | null,
  viewerUnlocked: boolean,
): string | null {
  return viewerUnlocked ? content : null
}

export function canViewCollectionResource(
  isPublic: boolean,
  ownerId: string,
  viewerId: string | null,
): boolean {
  return isPublic || ownerId === viewerId
}
