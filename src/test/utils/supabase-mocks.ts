import { vi } from "vitest";

/**
 * Mock data for authenticated user
 */
export const mockUser = {
  id: "test-user-id",
  email: "test@example.com",
  user_metadata: {
    full_name: "Test User",
  },
  app_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
};

/**
 * Mock session data
 */
export const mockSession = {
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token",
  expires_in: 3600,
  expires_at: Date.now() + 3600000,
  token_type: "bearer",
  user: mockUser,
};

/**
 * Create a mock Supabase channel for realtime subscriptions
 */
export function createMockChannel() {
  const listeners = new Map<string, Array<(...args: any[]) => void>>();

  return {
    on: vi.fn((event: string, callback: (...args: any[]) => void) => {
      if (!listeners.has(event)) {
        listeners.set(event, []);
      }
      listeners.get(event)?.push(callback);
      return mockChannel;
    }),
    subscribe: vi.fn((callback?: () => void) => {
      if (callback) callback();
      return mockChannel;
    }),
    unsubscribe: vi.fn(),
    send: vi.fn(),
    track: vi.fn(),
    untrack: vi.fn(),
    // Helper to trigger events in tests
    _trigger: (event: string, payload: any) => {
      listeners.get(event)?.forEach((cb) => cb(payload));
    },
  };
}

const mockChannel = createMockChannel();

/**
 * Create a chainable query builder mock
 */
export function createMockQueryBuilder() {
  const builder = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    containedBy: vi.fn().mockReturnThis(),
    rangeGt: vi.fn().mockReturnThis(),
    rangeGte: vi.fn().mockReturnThis(),
    rangeLt: vi.fn().mockReturnThis(),
    rangeLte: vi.fn().mockReturnThis(),
    rangeAdjacent: vi.fn().mockReturnThis(),
    overlaps: vi.fn().mockReturnThis(),
    textSearch: vi.fn().mockReturnThis(),
    match: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockReturnThis(),
    abortSignal: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    csv: vi.fn().mockResolvedValue({ data: "", error: null }),
    then: vi.fn((resolve) => {
      resolve({ data: [], error: null });
      return Promise.resolve({ data: [], error: null });
    }),
  };

  return builder;
}

/**
 * Create a mock Supabase storage bucket
 */
export function createMockStorage() {
  return {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue({ data: { path: "mock-path" }, error: null }),
      download: vi.fn().mockResolvedValue({ data: new Blob(), error: null }),
      list: vi.fn().mockResolvedValue({ data: [], error: null }),
      remove: vi.fn().mockResolvedValue({ data: [], error: null }),
      createSignedUrl: vi.fn().mockResolvedValue({
        data: { signedUrl: "https://mock-url.com" },
        error: null,
      }),
      getPublicUrl: vi.fn(() => ({
        data: { publicUrl: "https://mock-public-url.com" },
      })),
    })),
  };
}

/**
 * Create a complete mock Supabase client
 */
export function createMockSupabaseClient() {
  return {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: mockSession }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      }),
      signInWithOAuth: vi.fn().mockResolvedValue({ data: { url: "mock-url" }, error: null }),
      signUp: vi.fn().mockResolvedValue({
        data: { user: mockUser, session: mockSession },
        error: null,
      }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      onAuthStateChange: vi.fn((callback) => {
        callback("SIGNED_IN", mockSession);
        return {
          data: { subscription: { unsubscribe: vi.fn() } },
        };
      }),
    },
    from: vi.fn(() => createMockQueryBuilder()),
    channel: vi.fn(() => createMockChannel()),
    removeChannel: vi.fn(),
    getChannels: vi.fn(() => []),
    storage: createMockStorage(),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  };
}

/**
 * Helper to setup Supabase mocks with custom responses
 */
export function setupSupabaseMocks(
  overrides?: Partial<ReturnType<typeof createMockSupabaseClient>>
) {
  const mockClient = createMockSupabaseClient();

  if (overrides) {
    Object.assign(mockClient, overrides);
  }

  return mockClient;
}

/**
 * Helper to mock a successful query response
 */
export function mockQuerySuccess<T>(data: T) {
  return {
    data,
    error: null,
    count: Array.isArray(data) ? data.length : null,
    status: 200,
    statusText: "OK",
  };
}

/**
 * Helper to mock a query error
 */
export function mockQueryError(message: string, code?: string) {
  return {
    data: null,
    error: {
      message,
      code: code || "PGRST000",
      details: "",
      hint: "",
    },
    count: null,
    status: 400,
    statusText: "Bad Request",
  };
}
