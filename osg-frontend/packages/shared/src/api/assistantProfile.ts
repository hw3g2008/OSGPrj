import { http } from '../utils/request'

export interface AssistantProfile {
  userId?: number
  userName?: string
  nickName?: string
  email?: string
  phonenumber?: string
  sex?: string
  status?: string
  loginIp?: string
  loginDate?: string
  avatar?: string
  remark?: string
}

export interface AssistantProfileUpdatePayload extends AssistantProfile {
  nickName: string
  email: string
  phonenumber: string
  sex: string
}

export function getAssistantProfile() {
  return http.get<AssistantProfile>('/api/mentor/profile', {
    timeout: 60000,
  })
}

export function updateAssistantProfile(data: AssistantProfileUpdatePayload) {
  return http.put<{ code: number; msg: string }>('/api/mentor/profile', data, {
    timeout: 60000,
  })
}
