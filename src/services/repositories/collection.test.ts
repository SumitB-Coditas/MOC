import { describe, expect, it } from 'vitest'
import { AppError } from '@/lib/errors'
import { createMemoryStore } from '@/services/storage/keyValueStore'
import { STORAGE_KEYS } from '@/services/storage/keys'
import { createStorageClient } from '@/services/storage/storageClient'
import { defineCollection } from './collection'

interface Item {
  id: string
  name: string
}

const parseItem = (raw: unknown): Item => {
  const { id, name } = raw as Partial<Item>
  if (typeof id !== 'string' || typeof name !== 'string') throw new Error('invalid item')
  return { id, name }
}

const items = defineCollection<Item>(STORAGE_KEYS.users, parseItem)

function setup() {
  const client = createStorageClient(createMemoryStore())
  return { client, repo: items.repository(client) }
}

describe('defineCollection', () => {
  it('starts empty and supports insert, find and filter', () => {
    const { repo } = setup()
    expect(repo.list()).toEqual([])

    repo.insert({ id: '1', name: 'Ada' })
    repo.insert({ id: '2', name: 'Grace' })

    expect(repo.list()).toHaveLength(2)
    expect(repo.findById('2')).toEqual({ id: '2', name: 'Grace' })
    expect(repo.find((item) => item.name === 'Ada')?.id).toBe('1')
    expect(repo.filter((item) => item.name.startsWith('G'))).toHaveLength(1)
  })

  it('rejects duplicate ids with CONFLICT', () => {
    const { repo } = setup()
    repo.insert({ id: '1', name: 'Ada' })
    expect(() => repo.insert({ id: '1', name: 'Other' })).toThrow(
      expect.objectContaining({ code: 'CONFLICT' }),
    )
  })

  it('updates by shallow merge and never changes the id', () => {
    const { repo } = setup()
    repo.insert({ id: '1', name: 'Ada' })
    const updated = repo.update('1', { name: 'Ada L.' })

    expect(updated).toEqual({ id: '1', name: 'Ada L.' })
    expect(repo.findById('1')).toEqual(updated)
  })

  it('removes records and reports unknown ids as NOT_FOUND', () => {
    const { repo } = setup()
    repo.insert({ id: '1', name: 'Ada' })
    repo.remove('1')

    expect(repo.list()).toEqual([])
    expect(() => repo.remove('1')).toThrow(AppError)
    expect(() => repo.update('missing', { name: 'x' })).toThrow(
      expect.objectContaining({ code: 'NOT_FOUND' }),
    )
  })

  it('refuses to read (and therefore overwrite) a corrupted collection', () => {
    const { client, repo } = setup()
    client.write(STORAGE_KEYS.users, [{ id: '1' }])

    expect(() => repo.list()).toThrow(expect.objectContaining({ code: 'STORAGE_CORRUPTED' }))
    expect(() => repo.insert({ id: '2', name: 'New' })).toThrow(AppError)
  })

  it('participates in transactions across collections', () => {
    const { client } = setup()
    const others = defineCollection<Item>(STORAGE_KEYS.forms, parseItem)

    expect(() =>
      client.transaction((tx) => {
        items.repository(tx).insert({ id: '1', name: 'Ada' })
        others.repository(tx).insert({ id: '1', name: 'Form' })
        throw new Error('abort')
      }),
    ).toThrow('abort')

    expect(items.repository(client).list()).toEqual([])
    expect(others.repository(client).list()).toEqual([])
  })
})
