import type { VisualPageContract } from './visual-contract'

export function resolvePrototypePageKey(pageContract: VisualPageContract): string {
  const key = pageContract.prototype_page_key?.trim()
  return key || pageContract.page_id
}
