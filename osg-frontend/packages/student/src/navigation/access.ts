export const COMING_SOON_TOAST = '敬请期待'

export const STUDENT_AVAILABLE_PATHS = [
  '/dashboard',
  '/home',
  '/positions',
  '/applications',
  '/job-tracking',
  '/mock-practice',
  '/request',
  '/courses',
  '/myclass',
  '/profile'
] as const

const availablePathSet = new Set<string>(STUDENT_AVAILABLE_PATHS)

export function normalizeStudentPath(path: string): string {
  const withoutHash = path.split('#', 1)[0] ?? ''
  const withoutQuery = withoutHash.split('?', 1)[0] ?? ''
  const normalized = withoutQuery.replace(/\/+$/, '')
  return normalized || '/'
}

export function isStudentPathAvailable(path: string): boolean {
  return availablePathSet.has(normalizeStudentPath(path))
}

export function isStudentPathComingSoon(path: string): boolean {
  const normalized = normalizeStudentPath(path)
  if (!normalized.startsWith('/')) {
    return false
  }
  return !isStudentPathAvailable(normalized)
}
