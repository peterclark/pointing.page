/**
 * Chainable Supabase query-builder stub for unit tests.
 *
 * `@supabase/supabase-js` exposes a fluent builder — `from(t).select().eq().single()`
 * — where every intermediate call returns the builder and the builder itself is
 * awaitable. Hand-rolling that shape with nested `vi.fn().mockReturnValue({...})`
 * is verbose and breaks whenever a link is added to the chain, so this helper
 * synthesises it instead: every method returns the same proxy, and awaiting the
 * proxy anywhere in the chain resolves to the configured result.
 *
 * ```ts
 * const q = mockQuery({ data: room });
 * vi.mocked(supabase.from).mockReturnValue(q);
 *
 * await getRoomByCode('abc12345');
 * expect(q.calls).toEqual([
 *   { method: 'select', args: ['*'] },
 *   { method: 'eq', args: ['room_code', 'ABC12345'] },
 *   { method: 'maybeSingle', args: [] },
 * ]);
 * ```
 */

/** A recorded builder method call, in chain order. */
export interface RecordedCall {
  method: string;
  args: unknown[];
}

/** The subset of a PostgREST response the query functions actually read. */
export interface QueryResult {
  data?: unknown;
  error?: { message: string; code?: string; details?: string } | null;
  count?: number | null;
}

/** A stubbed builder: awaitable, infinitely chainable, and self-recording. */
export type MockQuery = {
  /** Methods invoked on this builder, in call order. */
  readonly calls: RecordedCall[];
  /** Method names only — convenient for coarse assertions. */
  readonly methods: string[];
  /** Args of the first call to `method`, or `undefined` if never called. */
  argsFor(method: string): unknown[] | undefined;
} & PromiseLike<QueryResult> &
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Record<string, any>;

/**
 * Build a stubbed query builder that resolves to `result`.
 *
 * Defaults to `{ data: null, error: null, count: null }` so a bare
 * `mockQuery()` models a successful no-op write.
 */
export function mockQuery(result: QueryResult = {}): MockQuery {
  const value: QueryResult = { data: null, error: null, count: null, ...result };
  const calls: RecordedCall[] = [];

  const proxy: MockQuery = new Proxy({} as MockQuery, {
    get(_target, prop) {
      // Let the runtime treat the proxy as a plain object, not a thenable or
      // a React element, when something other than `await` inspects it.
      if (typeof prop === 'symbol') return undefined;

      switch (prop) {
        case 'then':
          return (onFulfilled?: (v: QueryResult) => unknown, onRejected?: (e: unknown) => unknown) =>
            Promise.resolve(value).then(onFulfilled, onRejected);
        case 'calls':
          return calls;
        case 'methods':
          return calls.map((c) => c.method);
        case 'argsFor':
          return (method: string) => calls.find((c) => c.method === method)?.args;
        default:
          return (...args: unknown[]) => {
            calls.push({ method: prop, args });
            return proxy;
          };
      }
    },
  });

  return proxy;
}

/**
 * Convenience for a builder that fails with a PostgREST-shaped error.
 *
 * `code` defaults to a generic failure; pass `'PGRST116'` to exercise the
 * "no rows returned / blocked by RLS" branches the query layer special-cases.
 */
export function mockQueryError(message: string, code = '42501'): MockQuery {
  return mockQuery({ data: null, error: { message, code } });
}
