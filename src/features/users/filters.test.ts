import { describe, expect, it } from 'vitest'
import { DEFAULT_USER_FILTERS, parseUserFilters, toSearchParams } from './filters'

describe('user list URL filters', () => {
  it('defaults to all roles, active users and no search', () => {
    expect(parseUserFilters(new URLSearchParams())).toEqual(DEFAULT_USER_FILTERS)
  })

  it('round-trips non-default filters through the URL', () => {
    const filters = { search: 'ada', role: 'DIPLOMATE', status: 'INACTIVE' } as const
    const params = toSearchParams(filters)
    expect(params.toString()).toBe('q=ada&role=diplomate&status=inactive')
    expect(parseUserFilters(params)).toEqual(filters)
  })

  it('omits defaults and ignores unknown values', () => {
    expect(toSearchParams(DEFAULT_USER_FILTERS).toString()).toBe('')
    expect(parseUserFilters(new URLSearchParams('role=admin&status=deleted'))).toEqual(
      DEFAULT_USER_FILTERS,
    )
  })
})
