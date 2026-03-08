import fs from 'node:fs'
import path from 'node:path'
import type { Page } from '@playwright/test'
import type { VisualFixtureRoute } from './visual-contract'

function repoRoot(): string {
  return path.resolve(process.cwd(), '..')
}

function resolveFixturePath(responseRef: string): string {
  return path.resolve(repoRoot(), responseRef)
}

function normalizeApiCandidates(urlPath: string): string[] {
  if (urlPath.startsWith('/api/')) {
    return [urlPath, urlPath.replace(/^\/api/, '')]
  }
  if (urlPath.startsWith('/')) {
    return [urlPath, `/api${urlPath}`]
  }
  return [urlPath]
}

function loadFixtureBody(responseRef: string): string {
  const resolved = resolveFixturePath(responseRef)
  if (!fs.existsSync(resolved)) {
    throw new Error(`visual fixture response file not found: ${resolved}`)
  }
  return fs.readFileSync(resolved, 'utf-8')
}

export async function registerVisualFixtureRoutes(
  page: Page,
  routes: VisualFixtureRoute[],
): Promise<void> {
  const compiledRoutes = routes.map((fixtureRoute) => ({
    fixtureRoute,
    method: (fixtureRoute.method || 'GET').toUpperCase(),
    candidates: normalizeApiCandidates(fixtureRoute.url),
    body: loadFixtureBody(fixtureRoute.response_ref),
  }))

  await page.route('**/*', async (route) => {
    const request = route.request()
    const method = request.method().toUpperCase()
    const url = request.url()

    const matched = compiledRoutes.find(({ method: expectedMethod, candidates }) => {
      if (method !== expectedMethod) {
        return false
      }
      return candidates.some((candidate) => url.includes(candidate))
    })

    if (!matched) {
      await route.continue()
      return
    }

    await route.fulfill({
      status: matched.fixtureRoute.status || 200,
      contentType: 'application/json',
      headers: matched.fixtureRoute.headers,
      body: matched.body,
    })
  })
}
