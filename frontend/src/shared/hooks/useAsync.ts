import { useState, useEffect, useCallback } from 'react';

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error';

export interface AsyncState<T> {
  status: AsyncStatus;
  data: T | null;
  error: string | null;
}

/**
 * useAsync
 * Runs an async function and tracks loading / success / error state.
 */
export function useAsync<T>(
  fn: () => Promise<T>,
  deps: unknown[] = []
): AsyncState<T> & { refetch: () => void } {
  const [state, setState] = useState<AsyncState<T>>({
    status: 'idle',
    data: null,
    error: null,
  });

  const run = useCallback(async () => {
    setState({ status: 'loading', data: null, error: null });
    try {
      const data = await fn();
      setState({ status: 'success', data, error: null });
    } catch (e) {
      setState({
        status: 'error',
        data: null,
        error: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    run();
  }, [run]);

  return { ...state, refetch: run };
}

/**
 * useMutation
 * Runs an async function on demand and tracks mutation state.
 */
export function useMutation<TArgs extends unknown[], TResult>(
  fn: (...args: TArgs) => Promise<TResult>
): {
  mutate: (...args: TArgs) => Promise<TResult | undefined>;
  state: AsyncState<TResult>;
  reset: () => void;
} {
  const [state, setState] = useState<AsyncState<TResult>>({
    status: 'idle',
    data: null,
    error: null,
  });

  const mutate = useCallback(
    async (...args: TArgs): Promise<TResult | undefined> => {
      setState({ status: 'loading', data: null, error: null });
      try {
        const result = await fn(...args);
        setState({ status: 'success', data: result, error: null });
        return result;
      } catch (e) {
        setState({
          status: 'error',
          data: null,
          error: e instanceof Error ? e.message : 'Unknown error',
        });
        return undefined;
      }
    },
    [fn]
  );

  const reset = useCallback(() => {
    setState({ status: 'idle', data: null, error: null });
  }, []);

  return { mutate, state, reset };
}