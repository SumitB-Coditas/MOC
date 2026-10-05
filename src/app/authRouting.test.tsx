// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { ADMIN_ACCOUNT } from '@/config/admin'
import { AuthProvider } from '@/features/auth/AuthProvider'
import type { AuthService } from '@/features/auth/authService'
import {
  createTestAuthService,
  VALID_REGISTRATION,
} from '@/features/auth/testing/createTestAuthService'
import { usersCollection } from '@/services/repositories/users'
import { STORAGE_KEYS } from '@/services/storage/keys'
import type { UserRoleResolver } from '@/services/userRole'
import { routes } from './routes'

afterEach(cleanup)

function renderApp(path: string, service: AuthService) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <AuthProvider service={service}>
      <RouterProvider router={router} />
    </AuthProvider>,
  )
  return { router, user: userEvent.setup() }
}

async function expectPage(
  router: ReturnType<typeof renderApp>['router'],
  path: string,
  heading: string,
) {
  expect(await screen.findByRole('heading', { level: 1, name: heading })).toBeDefined()
  expect(router.state.location.pathname).toBe(path)
}

async function signedInAs(role: 'ADMIN' | 'CANDIDATE' | 'DIPLOMATE') {
  const resolveRole: UserRoleResolver = () => (role === 'DIPLOMATE' ? 'DIPLOMATE' : 'CANDIDATE')
  const test = createTestAuthService({ resolveRole })
  if (role === 'ADMIN') {
    await test.service.login({ email: ADMIN_ACCOUNT.email, password: ADMIN_ACCOUNT.password })
  } else {
    await test.service.register(VALID_REGISTRATION)
  }
  return test
}

describe('route protection', () => {
  it.each(['/admin/dashboard', '/candidate/dashboard', '/diplomate/dashboard', '/history', '/'])(
    'sends anonymous visitors from %s to /login',
    async (path) => {
      const { router } = renderApp(path, createTestAuthService().service)
      await expectPage(router, '/login', 'Sign in')
    },
  )

  it.each([
    ['ADMIN', '/candidate/dashboard', '/admin/dashboard', 'Admin Dashboard'],
    ['ADMIN', '/history', '/admin/dashboard', 'Admin Dashboard'],
    ['CANDIDATE', '/admin/dashboard', '/candidate/dashboard', 'Candidate Dashboard'],
    ['CANDIDATE', '/diplomate/dashboard', '/candidate/dashboard', 'Candidate Dashboard'],
    ['DIPLOMATE', '/candidate/dashboard', '/diplomate/dashboard', 'Diplomate Dashboard'],
    ['DIPLOMATE', '/admin/users', '/diplomate/dashboard', 'Diplomate Dashboard'],
  ] as const)('redirects %s from %s to their own dashboard', async (role, from, to, heading) => {
    const { service } = await signedInAs(role)
    const { router } = renderApp(from, service)
    await expectPage(router, to, heading)
  })

  it.each([
    ['ADMIN', '/admin/users', 'Users'],
    ['CANDIDATE', '/history', 'Certificate History'],
    ['DIPLOMATE', '/profile', 'Profile'],
  ] as const)('lets %s open %s', async (role, path, heading) => {
    const { service } = await signedInAs(role)
    const { router } = renderApp(path, service)
    await expectPage(router, path, heading)
  })

  it.each([
    ['ADMIN', '/admin/dashboard'],
    ['CANDIDATE', '/candidate/dashboard'],
    ['DIPLOMATE', '/diplomate/dashboard'],
  ] as const)('sends a signed-in %s away from /login and / to %s', async (role, home) => {
    const { service } = await signedInAs(role)
    for (const path of ['/login', '/register', '/']) {
      cleanup()
      const { router } = renderApp(path, service)
      await waitFor(() => expect(router.state.location.pathname).toBe(home))
    }
  })

  it('keeps the 403 and 404 pages reachable', async () => {
    const { service } = createTestAuthService()
    let { router } = renderApp('/403', service)
    await expectPage(router, '/403', 'Access denied')
    cleanup()
    ;({ router } = renderApp('/no-such-page', service))
    await expectPage(router, '/no-such-page', 'Page not found')
  })
})

describe('login page', () => {
  it('signs the admin in and redirects to the admin dashboard', async () => {
    const { router, user } = renderApp('/login', createTestAuthService().service)

    await user.type(await screen.findByLabelText(/^Email/), ADMIN_ACCOUNT.email)
    await user.type(screen.getByLabelText(/^Password/), ADMIN_ACCOUNT.password)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await expectPage(router, '/admin/dashboard', 'Admin Dashboard')
  })

  it('shows a generic error for invalid credentials', async () => {
    const { router, user } = renderApp('/login', createTestAuthService().service)

    await user.type(await screen.findByLabelText(/^Email/), 'nobody@example.com')
    await user.type(screen.getByLabelText(/^Password/), 'Wrong1234')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByText('Invalid email or password.')).toBeDefined()
    expect(router.state.location.pathname).toBe('/login')
  })

  it('links to registration', async () => {
    const { router, user } = renderApp('/login', createTestAuthService().service)
    await user.click(await screen.findByRole('link', { name: 'Create an account' }))
    await expectPage(router, '/register', 'Create a candidate account')
  })
})

describe('registration page', () => {
  it('registers a Candidate and lands on the Candidate dashboard', async () => {
    const { service, storage } = createTestAuthService()
    const { router, user } = renderApp('/register', service)

    await fillRegistration(user)

    await expectPage(router, '/candidate/dashboard', 'Candidate Dashboard')
    expect(screen.getByText('Candidate', { selector: '[data-slot=badge]' })).toBeDefined()
    expect(usersCollection.repository(storage).list()).toHaveLength(1)
  })

  it('blocks submission when the password confirmation does not match', async () => {
    const { service, storage } = createTestAuthService()
    const { router, user } = renderApp('/register', service)

    await fillRegistration(user, { confirmPassword: 'Different123' })

    expect(await screen.findByText('Passwords do not match.')).toBeDefined()
    expect(router.state.location.pathname).toBe('/register')
    expect(usersCollection.repository(storage).list()).toEqual([])
  })

  it('shows a field error for an email that is already registered', async () => {
    const { service } = createTestAuthService()
    await service.register(VALID_REGISTRATION)
    await service.logout()
    const { router, user } = renderApp('/register', service)

    await fillRegistration(user, { email: 'JANE.DOE@example.com' })

    expect(await screen.findByText('An account with this email already exists.')).toBeDefined()
    expect(screen.getByLabelText(/^Email/).getAttribute('aria-invalid')).toBe('true')
    expect(router.state.location.pathname).toBe('/register')
  })

  it('offers no way to choose a role', async () => {
    renderApp('/register', createTestAuthService().service)
    await screen.findByRole('heading', { name: 'Create a candidate account' })
    expect(screen.queryByLabelText(/role/i)).toBeNull()
    expect(screen.queryByRole('combobox')).toBeNull()
  })
})

describe('session lifecycle', () => {
  it('keeps the user signed in across a reload', async () => {
    const { service, storage } = createTestAuthService()
    const first = renderApp('/register', service)
    await fillRegistration(first.user)
    await expectPage(first.router, '/candidate/dashboard', 'Candidate Dashboard')

    cleanup()
    const reloaded = createTestAuthService({ storage }).service
    const { router } = renderApp('/candidate/dashboard', reloaded)
    await expectPage(router, '/candidate/dashboard', 'Candidate Dashboard')
  })

  it('logs out, clears the session and returns to /login', async () => {
    const { service, storage } = await signedInAs('CANDIDATE')
    const { router, user } = renderApp('/candidate/dashboard', service)
    await expectPage(router, '/candidate/dashboard', 'Candidate Dashboard')

    await user.click(screen.getByRole('button', { name: 'Log out' }))

    await expectPage(router, '/login', 'Sign in')
    expect(storage.has(STORAGE_KEYS.session)).toBe(false)
  })
})

async function fillRegistration(
  user: ReturnType<typeof userEvent.setup>,
  overrides: Partial<typeof VALID_REGISTRATION & { confirmPassword: string }> = {},
) {
  const values = {
    ...VALID_REGISTRATION,
    confirmPassword: VALID_REGISTRATION.password,
    ...overrides,
  }
  await user.type(await screen.findByLabelText(/^First name/), values.firstName)
  await user.type(screen.getByLabelText(/^Last name/), values.lastName)
  fireEvent.change(screen.getByLabelText(/^Date of birth/), {
    target: { value: values.dateOfBirth },
  })
  await user.type(screen.getByLabelText(/^Email/), values.email)
  await user.type(screen.getByLabelText(/^Password/), values.password)
  await user.type(screen.getByLabelText(/^Confirm password/), values.confirmPassword)
  await user.click(screen.getByRole('button', { name: 'Create account' }))
}
