import { ref } from 'vue'
import { getMustChangePwd, setMustChangePwd } from '../utils/storage'

const flag = ref(getMustChangePwd())

export function useMustChangePassword() {
  return {
    mustChangePassword: flag,
    setMustChangePassword(value: boolean) {
      flag.value = value
      setMustChangePwd(value)
    },
  }
}
