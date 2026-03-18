import { http } from '@osg/shared/utils/request'

export function getMentorProfile() {
  return http.get<any>('/api/mentor/profile')
}

export function updateMentorProfile(data: any) {
  return http.put('/api/mentor/profile', data)
}
