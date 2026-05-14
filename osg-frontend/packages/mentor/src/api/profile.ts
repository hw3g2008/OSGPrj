import { http } from '@osg/shared/utils/request'

export function getMentorProfile() {
  return http.get<any>('/mentor/profile')
}

export function updateMentorProfile(data: any) {
  return http.put('/mentor/profile', data)
}
