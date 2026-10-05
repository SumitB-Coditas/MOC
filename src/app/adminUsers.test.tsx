// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { afterEach, describe, expect, it } from 'vitest'
import { ADMIN_ACCOUNT } from '@/config/admin'
import { AuthProvider } from '@/features/auth/AuthProvider'
import { createAdminTestContext, SECRET_HASH, SECRET_SALT } from '@/features/users/testing/fixtures'
import { UsersServiceContext } from '@/features/users/usersServiceContext'
import { routes } from './routes'

afterEach(cleanup)

type Context = ReturnType<typeof createAdminTestContext>

function renderApp(path: string, context: Context) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  render(
    <UsersServiceContext.Provider value={context.usersService}>
      <AuthProvider service={context.auth}>
        <RouterProvider router={router} />
      </AuthProvider>
    </UsersServiceContext.Provider>,
  )
  return { router, user: userEvent.setup() }
}

async function asAdmin(path: string) {
  const context = createAdminTestContext()
  await context.signInAsAdmin()
  return { context, ...renderApp(path, context) }
}

function location(router: ReturnType<typeof renderApp>['router']) {
  return `${router.state.location.pathname}${router.state.location.search}`
}

async function tableNames() {
  const table = await screen.findByRole('table')
  return within(table)
    .getAllByRole('link')
    .map((link) => link.textContent)
}

function expectNoPasswordData() {
  const html = document.body.innerHTML
  expect(html).not.toContain(SECRET_HASH)
  expect(html).not.toContain(SECRET_SALT)
  expect(html.toLowerCase()).not.toContain('password')
}

describe('admin dashboard', () => {
  it('shows user totals and the role breakdown to the Admin', async () => {
    await asAdmin('/admin/dashboard')

    expect(await screen.findByRole('link', { name: /Active users\s*3/ })).toBeDefined()
    expect(screen.getByRole('link', { name: /Active candidates\s*2/ })).toBeDefined()
    expect(screen.getByRole('link', { name: /Active diplomates\s*1/ })).toBeDefined()
    expect(screen.getByRole('link', { name: /Inactive accounts\s*1/ })).toBeDefined()
    expect(
      screen.getByRole('img', { name: 'Candidates 2 of 3 (67%), Diplomates 1 of 3 (33%)' }),
    ).toBeDefined()
  })

  it('links to user management, pre-filtered from a tile', async () => {
    const { router, user } = await asAdmin('/admin/dashboard')

    await user.click(await screen.findByRole('link', { name: /Active diplomates/ }))
    await waitFor(() => expect(location(router)).toBe('/admin/users?role=diplomate'))
    await waitFor(async () => expect(await tableNames()).toEqual(['Grace Hopper']))

    await router.navigate('/admin/dashboard')
    await user.click(await screen.findByRole('link', { name: /Manage users/ }))
    await waitFor(() => expect(location(router)).toBe('/admin/users'))
  })

  it.each([
    ['CANDIDATE', '/admin/dashboard', '/candidate/dashboard'],
    ['CANDIDATE', '/admin/users/u-ada', '/candidate/dashboard'],
    ['DIPLOMATE', '/admin/dashboard', '/diplomate/dashboard'],
    ['DIPLOMATE', '/admin/users', '/diplomate/dashboard'],
  ] as const)('keeps a %s out of %s', async (role, path, home) => {
    const email = 'member@example.com'
    const context = createAdminTestContext({
      diplomateEmails: role === 'DIPLOMATE' ? [email] : [],
    })
    await context.auth.register({
      firstName: 'Mia',
      lastName: 'Member',
      dateOfBirth: '1992-02-02',
      email,
      password: 'Secret123',
    })

    const { router } = renderApp(path, context)
    await waitFor(() => expect(router.state.location.pathname).toBe(home))
    expect(screen.queryByText('Active users')).toBeNull()
  })
})

describe('user list', () => {
  it('shows active users with their details and no password data', async () => {
    await asAdmin('/admin/users')

    expect(await tableNames()).toEqual(['Grace Hopper', 'Ada Lovelace', 'Alan Turing'])
    const adaRow = screen.getByRole('link', { name: 'Ada Lovelace' }).closest('tr')!
    const cells = within(adaRow)
      .getAllByRole('cell')
      .map((cell) => cell.textContent)
    expect(cells.slice(0, 5)).toEqual([
      'Ada Lovelace',
      'ada@example.com',
      '10 Dec 1985',
      'Candidate',
      expect.stringContaining('1 Mar 2026'),
    ])
    expect(cells[5]).toBe('Active')
    expect(screen.getByText('3 users')).toBeDefined()
    expectNoPasswordData()
  })

  it('searches by name and email, keeping the search in the URL', async () => {
    const { router, user } = await asAdmin('/admin/users')
    const search = await screen.findByRole('searchbox', { name: 'Search' })

    await user.type(search, 'turing')
    await waitFor(async () => expect(await tableNames()).toEqual(['Alan Turing']))
    expect(location(router)).toBe('/admin/users?q=turing')

    await user.clear(search)
    await user.type(search, 'NAVY.example')
    await waitFor(async () => expect(await tableNames()).toEqual(['Grace Hopper']))
  })

  it('filters by role', async () => {
    const { user } = await asAdmin('/admin/users')

    await user.selectOptions(await screen.findByLabelText('Role'), 'DIPLOMATE')
    await waitFor(async () => expect(await tableNames()).toEqual(['Grace Hopper']))

    await user.selectOptions(screen.getByLabelText('Role'), 'CANDIDATE')
    await waitFor(async () => expect(await tableNames()).toEqual(['Ada Lovelace', 'Alan Turing']))
  })

  it('filters by active / inactive status', async () => {
    const { router, user } = await asAdmin('/admin/users')

    await user.selectOptions(await screen.findByLabelText('Status'), 'INACTIVE')
    await waitFor(async () => expect(await tableNames()).toEqual(['Katherine Johnson']))
    expect(location(router)).toBe('/admin/users?status=inactive')

    await user.selectOptions(screen.getByLabelText('Status'), 'ALL')
    await waitFor(async () => expect(await tableNames()).toHaveLength(4))
  })

  it('restores filters from the URL and offers to clear an empty result', async () => {
    const { user } = await asAdmin('/admin/users?q=nobody&role=candidate')

    expect(await screen.findByText('No users match your filters')).toBeDefined()
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('nobody')

    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    await waitFor(async () => expect(await tableNames()).toHaveLength(3))
  })

  it('shows an empty state when nobody has registered', async () => {
    const context = createAdminTestContext({ users: [] })
    await context.signInAsAdmin()
    renderApp('/admin/users', context)
    expect(await screen.findByText('No users yet')).toBeDefined()
  })
})

describe('user details', () => {
  it('loads the requested user without password data', async () => {
    const { user } = await asAdmin('/admin/users')
    await user.click(await screen.findByRole('link', { name: 'Alan Turing' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Alan Turing' })).toBeDefined()
    expect(screen.getByText('alan.turing@example.com', { selector: 'dd' })).toBeDefined()
    expect(screen.getByText('u-alan')).toBeDefined()
    expectNoPasswordData()
  })

  it('edits the profile and confirms success', async () => {
    const { context, user } = await asAdmin('/admin/users/u-alan')
    await user.click(await screen.findByRole('button', { name: /Edit profile/ }))

    const firstName = screen.getByLabelText(/^First name/)
    await user.clear(firstName)
    await user.type(firstName, 'Alana')
    const email = screen.getByLabelText(/^Email/)
    await user.clear(email)
    await user.type(email, ' Alana.Turing@Example.COM ')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Profile updated.')).toBeDefined()
    expect(await screen.findByRole('heading', { level: 1, name: 'Alana Turing' })).toBeDefined()
    expect(context.repository.findById('u-alan')?.email).toBe('alana.turing@example.com')
  })

  it('rejects invalid data in the form', async () => {
    const { context, user } = await asAdmin('/admin/users/u-alan')
    await user.click(await screen.findByRole('button', { name: /Edit profile/ }))

    await user.clear(screen.getByLabelText(/^First name/))
    await user.clear(screen.getByLabelText(/^Email/))
    await user.type(screen.getByLabelText(/^Email/), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('First name is required.')).toBeDefined()
    expect(screen.getByText('Enter a valid email address.')).toBeDefined()
    expect(context.repository.findById('u-alan')?.firstName).toBe('Alan')
  })

  it.each([
    ['ADA@Example.com', 'An account with this email already exists.'],
    [ADMIN_ACCOUNT.email.toUpperCase(), 'This email address is reserved.'],
  ])('rejects the email %s', async (value, message) => {
    const { context, user } = await asAdmin('/admin/users/u-alan')
    await user.click(await screen.findByRole('button', { name: /Edit profile/ }))

    const email = screen.getByLabelText(/^Email/)
    await user.clear(email)
    await user.type(email, value)
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText(message)).toBeDefined()
    expect(email.getAttribute('aria-invalid')).toBe('true')
    expect(context.repository.findById('u-alan')?.email).toBe('alan.turing@example.com')
  })

  it('offers no way to edit the password, id or role', async () => {
    const { user } = await asAdmin('/admin/users/u-alan')
    await user.click(await screen.findByRole('button', { name: /Edit profile/ }))

    const form = screen.getByRole('form', { name: 'Edit profile' })
    // First name, last name and email are text boxes; date of birth is a date input.
    expect(within(form).getAllByRole('textbox')).toHaveLength(3)
    expect(within(form).getByLabelText(/^Date of birth/)).toBeDefined()
    expect(within(form).queryByLabelText(/password|role|id/i)).toBeNull()
  })

  it('shows "User not found" for unknown ids, including the admin account', async () => {
    for (const id of ['missing', ADMIN_ACCOUNT.id]) {
      cleanup()
      await asAdmin(`/admin/users/${id}`)
      expect(await screen.findByText('User not found')).toBeDefined()
      expect(screen.queryByRole('button', { name: /Deactivate/ })).toBeNull()
    }
  })
})

describe('deactivation', () => {
  it('deactivates after confirmation, then reactivates', async () => {
    const { context, router, user } = await asAdmin('/admin/users/u-alan')

    await user.click(await screen.findByRole('button', { name: /Deactivate user/ }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Deactivate Alan Turing?' })
    await user.click(within(dialog).getByRole('button', { name: 'Deactivate' }))

    expect(await screen.findByText('Alan Turing has been deactivated.')).toBeDefined()
    expect(await screen.findByText('This account is inactive')).toBeDefined()
    expect(context.repository.findById('u-alan')?.deletedAt).toBeDefined()

    // Gone from the default (active) list, present under the inactive filter.
    await router.navigate('/admin/users')
    await waitFor(async () => expect(await tableNames()).not.toContain('Alan Turing'))
    await router.navigate('/admin/users?status=inactive')
    await waitFor(async () => expect(await tableNames()).toContain('Alan Turing'))

    await router.navigate('/admin/users/u-alan')
    await user.click(await screen.findByRole('button', { name: /Reactivate user/ }))
    const confirm = await screen.findByRole('alertdialog', { name: 'Reactivate Alan Turing?' })
    await user.click(within(confirm).getByRole('button', { name: 'Reactivate' }))

    expect(await screen.findByText('Alan Turing is active again.')).toBeDefined()
    expect(context.repository.findById('u-alan')?.deletedAt).toBeUndefined()
  })

  it('does nothing when the confirmation is cancelled', async () => {
    const { context, user } = await asAdmin('/admin/users/u-alan')

    await user.click(await screen.findByRole('button', { name: /Deactivate user/ }))
    await user.click(await screen.findByRole('button', { name: 'Cancel' }))

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(context.repository.findById('u-alan')?.deletedAt).toBeUndefined()
  })

  it('signs a deactivated Candidate out on their next session check', async () => {
    const context = createAdminTestContext()
    const member = await context.auth.register({
      firstName: 'Mia',
      lastName: 'Member',
      dateOfBirth: '1992-02-02',
      email: 'mia@example.com',
      password: 'Secret123',
    })
    let { router } = renderApp('/candidate/dashboard', context)
    await waitFor(() => expect(router.state.location.pathname).toBe('/candidate/dashboard'))

    context.repository.update(member.id, { deletedAt: new Date().toISOString() })
    cleanup()
    ;({ router } = renderApp('/candidate/dashboard', context))

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
  })
})
