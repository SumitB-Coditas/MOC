import { describe, expect, it } from 'vitest'
import { AppError } from '@/lib/errors'
import { createMemoryStore, type KeyValueStore } from './keyValueStore'
import { STORAGE_KEYS } from './keys'
import { createStorageClient, toStorageKey, type Parser } from './storageClient'

const parseNumber: Parser<number> = (raw) => {
  if (typeof raw !== 'number') throw new Error('not a number')
  return raw
}
const parseAny: Parser<unknown> = (raw) => raw

function setup(initial: Record<string, string> = {}) {
  const store = createMemoryStore(initial)
  return { store, client: createStorageClient(store) }
}

function expectAppError(fn: () => unknown, code: AppError['code']) {
  try {
    fn()
  } catch (error) {
    expect(error).toBeInstanceOf(AppError)
    expect((error as AppError).code).toBe(code)
    return
  }
  throw new Error(`Expected AppError ${code}`)
}

describe('storageClient', () => {
  it('writes JSON under the namespaced key and reads it back', () => {
    const { store, client } = setup()
    client.write(STORAGE_KEYS.users, [{ id: '1' }])

    expect(store.getItem('cms:users')).toBe('[{"id":"1"}]')
    expect(client.read(STORAGE_KEYS.users, parseAny)).toEqual([{ id: '1' }])
    expect(client.has(STORAGE_KEYS.users)).toBe(true)
  })

  it('returns undefined for a missing key', () => {
    const { client } = setup()
    expect(client.read(STORAGE_KEYS.users, parseAny)).toBeUndefined()
    expect(client.has(STORAGE_KEYS.users)).toBe(false)
  })

  it('throws STORAGE_CORRUPTED for invalid JSON and leaves the data untouched', () => {
    const { store, client } = setup({ [toStorageKey(STORAGE_KEYS.users)]: '{not json' })
    expectAppError(() => client.read(STORAGE_KEYS.users, parseAny), 'STORAGE_CORRUPTED')
    expect(store.getItem('cms:users')).toBe('{not json')
  })

  it('throws STORAGE_CORRUPTED when the parser rejects the value', () => {
    const { client } = setup()
    client.write(STORAGE_KEYS.clockOffsetDays, 'seven')
    expectAppError(
      () => client.read(STORAGE_KEYS.clockOffsetDays, parseNumber),
      'STORAGE_CORRUPTED',
    )
  })

  it('maps a quota error to STORAGE_FULL', () => {
    const store: KeyValueStore = {
      ...createMemoryStore(),
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError')
      },
    }
    const client = createStorageClient(store)
    expectAppError(() => client.write(STORAGE_KEYS.users, []), 'STORAGE_FULL')
  })

  it('removes a key', () => {
    const { client } = setup()
    client.write(STORAGE_KEYS.session, { id: 'x' })
    client.remove(STORAGE_KEYS.session)
    expect(client.has(STORAGE_KEYS.session)).toBe(false)
  })

  it('clears only keys in its own namespace', () => {
    const { store, client } = setup({ 'other-app:token': 'keep' })
    client.write(STORAGE_KEYS.users, [])
    client.write(STORAGE_KEYS.meta, {})

    client.clear()

    expect(store.length).toBe(1)
    expect(store.getItem('other-app:token')).toBe('keep')
  })

  describe('transaction', () => {
    it('applies all writes and returns the callback result', () => {
      const { client } = setup()
      const result = client.transaction((tx) => {
        tx.write(STORAGE_KEYS.users, ['u'])
        tx.write(STORAGE_KEYS.forms, ['f'])
        return 'done'
      })

      expect(result).toBe('done')
      expect(client.read(STORAGE_KEYS.users, parseAny)).toEqual(['u'])
      expect(client.read(STORAGE_KEYS.forms, parseAny)).toEqual(['f'])
    })

    it('lets reads inside the transaction see pending writes and removals', () => {
      const { client } = setup()
      client.write(STORAGE_KEYS.session, 'old')

      client.transaction((tx) => {
        tx.write(STORAGE_KEYS.users, ['pending'])
        tx.remove(STORAGE_KEYS.session)
        expect(tx.read(STORAGE_KEYS.users, parseAny)).toEqual(['pending'])
        expect(tx.has(STORAGE_KEYS.session)).toBe(false)
        // Nothing is persisted until the callback finishes.
        expect(client.has(STORAGE_KEYS.users)).toBe(false)
      })
    })

    it('writes nothing when the callback throws', () => {
      const { client } = setup()
      expect(() =>
        client.transaction((tx) => {
          tx.write(STORAGE_KEYS.users, ['u'])
          throw new Error('boom')
        }),
      ).toThrow('boom')
      expect(client.has(STORAGE_KEYS.users)).toBe(false)
    })

    it('rolls back earlier writes when a later write fails', () => {
      const base = createMemoryStore({ [toStorageKey(STORAGE_KEYS.users)]: '["original"]' })
      const store: KeyValueStore = {
        ...base,
        getItem: base.getItem,
        setItem: (key, value) => {
          if (key === toStorageKey(STORAGE_KEYS.forms)) {
            throw new DOMException('full', 'QuotaExceededError')
          }
          base.setItem(key, value)
        },
      }
      const client = createStorageClient(store)

      expectAppError(
        () =>
          client.transaction((tx) => {
            tx.write(STORAGE_KEYS.users, ['changed'])
            tx.write(STORAGE_KEYS.forms, ['new'])
          }),
        'STORAGE_FULL',
      )
      expect(client.read(STORAGE_KEYS.users, parseAny)).toEqual(['original'])
      expect(client.has(STORAGE_KEYS.forms)).toBe(false)
    })
  })
})
