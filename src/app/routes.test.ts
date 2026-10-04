import { generatePath, matchRoutes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { buildPath, ROUTES } from '@/config/routes'
import { routes } from './routes'

/** Flattens the nested ROUTES object into a list of path patterns. */
function collectPatterns(node: unknown): string[] {
  if (typeof node === 'string') return [node]
  return Object.values(node as Record<string, unknown>).flatMap(collectPatterns)
}

/** Fills every `:param` with a sample value so the pattern can be matched. */
function samplePath(pattern: string): string {
  const params = Object.fromEntries(
    [...pattern.matchAll(/:(\w+)/g)].map(([, name]) => [name, `sample-${name}`]),
  )
  return generatePath(pattern, params)
}

describe('route tree', () => {
  const patterns = collectPatterns(ROUTES)

  it.each(patterns)('resolves %s to a dedicated route (not the 404 fallback)', (pattern) => {
    const matches = matchRoutes(routes, samplePath(pattern))
    const leaf = matches?.at(-1)?.route

    expect(leaf).toBeDefined()
    expect(leaf?.path).not.toBe('*')
  })

  it('sends unknown URLs to the 404 fallback', () => {
    const leaf = matchRoutes(routes, '/does-not-exist')?.at(-1)?.route
    expect(leaf?.path).toBe('*')
  })
})

describe('buildPath', () => {
  it('builds parameterised URLs', () => {
    expect(buildPath.adminUserDetail('u1')).toBe('/admin/users/u1')
    expect(buildPath.adminSubmissionDetail('s1')).toBe('/admin/submissions/s1')
    expect(buildPath.fillForm('a1')).toBe('/forms/a1')
    expect(buildPath.historyDetail('s1')).toBe('/history/s1')
  })
})
