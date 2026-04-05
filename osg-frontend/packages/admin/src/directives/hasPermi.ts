import type { Directive } from 'vue'
import { useUserStore } from '@/stores/user'

export function hasAnyPermission(required: string | string[] | undefined, granted: string[]): boolean {
  if (!required) return true
  if (granted.includes('*:*:*')) return true

  const expected = Array.isArray(required) ? required : [required]
  return expected.some((permission) => granted.includes(permission))
}

function enforcePermission(el: HTMLElement, value: string | string[] | undefined) {
  const userStore = useUserStore()
  if (hasAnyPermission(value, userStore.permissions)) {
    return
  }

  if (el.parentNode) {
    el.parentNode.removeChild(el)
  }
}

const hasPermiDirective: Directive<HTMLElement, string | string[]> = {
  mounted(el, binding) {
    enforcePermission(el, binding.value)
  },
  updated(el, binding) {
    enforcePermission(el, binding.value)
  },
}

export default hasPermiDirective
