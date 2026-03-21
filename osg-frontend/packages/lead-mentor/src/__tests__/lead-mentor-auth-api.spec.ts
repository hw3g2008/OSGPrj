import {
  getLeadMentorInfo,
  leadMentorLogin,
} from '../../../shared/src/api/auth'

vi.mock('../../../shared/src/utils/request', () => ({
  http: {
    post: vi.fn(),
    get: vi.fn(),
  },
}))

import { http } from '../../../shared/src/utils/request'

describe('lead-mentor auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls POST /lead-mentor/login with public auth request flags', async () => {
    vi.mocked(http.post).mockResolvedValue({ token: 'lead-token' })

    const result = await leadMentorLogin({
      username: 'lead',
      password: 'secret',
    })

    expect(http.post).toHaveBeenCalledWith(
      '/lead-mentor/login',
      { username: 'lead', password: 'secret' },
      { skipErrorMessage: true, skipAuthRedirect: true },
    )
    expect(result).toEqual({ token: 'lead-token' })
  })

  it('calls GET /lead-mentor/getInfo', async () => {
    vi.mocked(http.get).mockResolvedValue({
      user: { userId: 1, userName: 'lead' },
      roles: ['lead-mentor'],
      permissions: [],
    })

    const result = await getLeadMentorInfo()

    expect(http.get).toHaveBeenCalledWith('/lead-mentor/getInfo')
    expect(result.roles).toContain('lead-mentor')
  })
})
