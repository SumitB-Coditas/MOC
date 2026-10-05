import { useCallback, useEffect, useState } from 'react'

export type AsyncState<T> =
  | { status: 'loading'; data: T | undefined; error: undefined }
  | { status: 'success'; data: T; error: undefined }
  | { status: 'error'; data: T | undefined; error: unknown }

/**
 * Runs `load` (memoize it with useCallback) and tracks its result. Re-runs when `load`
 * changes or `reload()` is called. Previous data stays visible while a reload is in flight.
 */
export function useAsync<T>(load: () => Promise<T>): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({
    status: 'loading',
    data: undefined,
    error: undefined,
  })
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true
    load().then(
      (data) => {
        if (active) setState({ status: 'success', data, error: undefined })
      },
      (error: unknown) => {
        if (active) setState((previous) => ({ status: 'error', data: previous.data, error }))
      },
    )
    return () => {
      active = false
    }
  }, [load, version])

  const reload = useCallback(() => setVersion((current) => current + 1), [])
  return { ...state, reload }
}
