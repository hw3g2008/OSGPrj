import {
  getLeadMentorProfile,
  submitLeadMentorProfileChangeRequest,
} from '../../../shared/src/api/profile'

vi.mock('../../../shared/src/utils/request', () => ({
  http: {
    get: vi.fn(),
    post: vi.fn(),
  },
}))

import { http } from '../../../shared/src/utils/request'

describe('lead-mentor profile API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls GET /lead-mentor/profile', async () => {
    vi.mocked(http.get).mockResolvedValue({
      profile: { staffId: 810, englishName: 'Lead Mentor' },
      pendingChanges: [],
      pendingCount: 0,
    })

    const result = await getLeadMentorProfile()

    expect(http.get).toHaveBeenCalledWith('/lead-mentor/profile')
    expect(result.profile.staffId).toBe(810)
  })

  it('calls POST /lead-mentor/profile/change-request with the real payload', async () => {
    vi.mocked(http.post).mockResolvedValue({
      staffId: 810,
      changeRequestId: 9201,
      changeRequestIds: [9201],
      createdCount: 1,
      profile: { staffId: 810, englishName: 'Lead Mentor' },
      pendingChanges: [],
      pendingCount: 1,
      requests: [],
    })

    const payload = {
      staffId: 810,
      englishName: 'Updated Lead Mentor',
      genderLabel: 'Male',
      phone: '+86 139-0000-0000',
      wechatId: 'leadmentor_new',
      email: 'updated.lead@example.com',
      regionArea: '北美',
      regionCity: 'New York 纽约',
    }

    const result = await submitLeadMentorProfileChangeRequest(payload)

    expect(http.post).toHaveBeenCalledWith('/lead-mentor/profile/change-request', payload)
    expect(result.changeRequestId).toBe(9201)
  })
})
