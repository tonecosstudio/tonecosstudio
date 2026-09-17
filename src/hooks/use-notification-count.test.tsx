import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCurrentUserIsAdmin } from "@/lib/roles";
import {
  getCurrentAuthSession,
  subscribeToAuthSessionChanges,
} from "@/services/auth/auth-session-service";
import {
  fetchNotificationCount,
  subscribeToNotificationCountChanges,
} from "@/services/notifications/notification-count-service";
import {
  useFormattedNotificationCount,
  useNotificationCount,
} from "./use-notification-count";

vi.mock("@/lib/roles", () => ({
  useCurrentUserIsAdmin: vi.fn(),
}));

vi.mock("@/services/auth/auth-session-service", () => ({
  getCurrentAuthSession: vi.fn(),
  subscribeToAuthSessionChanges: vi.fn(),
}));

vi.mock("@/services/notifications/notification-count-service", () => ({
  EMPTY_CUSTOMER_NOTIFICATION_COUNT: {
    total: 0,
    pendingPayments: 0,
    underReviewPayments: 0,
    requiresInfoPayments: 0,
    unreadMessages: 0,
    isAdmin: false,
  },
  fetchNotificationCount: vi.fn(),
  subscribeToNotificationCountChanges: vi.fn(),
}));

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function sessionFor(userId: string) {
  return {
    user: { id: userId },
  } as Awaited<ReturnType<typeof getCurrentAuthSession>>;
}

function notificationCount(overrides: Partial<Awaited<ReturnType<typeof fetchNotificationCount>>> = {}) {
  return {
    total: 0,
    pendingPayments: 0,
    underReviewPayments: 0,
    requiresInfoPayments: 0,
    unreadMessages: 0,
    isAdmin: false,
    ...overrides,
  };
}

describe("useNotificationCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getCurrentAuthSession).mockResolvedValue(null);
    vi.mocked(subscribeToAuthSessionChanges).mockReturnValue(vi.fn());
    vi.mocked(subscribeToNotificationCountChanges).mockReturnValue(vi.fn());
    vi.mocked(useCurrentUserIsAdmin).mockReturnValue({
      data: false,
      isLoading: false,
    });
    vi.mocked(fetchNotificationCount).mockResolvedValue(notificationCount());
  });

  it("returns zero after auth resolves without a user", async () => {
    const { result } = renderHook(() => useNotificationCount(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current).toMatchObject({
      total: 0,
      pendingPayments: 0,
      underReviewPayments: 0,
      requiresInfoPayments: 0,
      unreadMessages: 0,
      isAdmin: false,
      error: null,
    });
    expect(fetchNotificationCount).not.toHaveBeenCalled();
  });

  it("loads the customer count through the notification service", async () => {
    vi.mocked(getCurrentAuthSession).mockResolvedValue(sessionFor("customer-123"));
    vi.mocked(fetchNotificationCount).mockResolvedValue(
      notificationCount({
        total: 3,
        requiresInfoPayments: 1,
        unreadMessages: 2,
      }),
    );

    const { result } = renderHook(() => useNotificationCount(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchNotificationCount).toHaveBeenCalledWith({
      userId: "customer-123",
      isAdmin: false,
    });
    expect(result.current.total).toBe(3);
    expect(result.current.requiresInfoPayments).toBe(1);
    expect(result.current.unreadMessages).toBe(2);
  });

  it("loads the admin count after role resolution", async () => {
    vi.mocked(getCurrentAuthSession).mockResolvedValue(sessionFor("admin-123"));
    vi.mocked(useCurrentUserIsAdmin).mockReturnValue({
      data: true,
      isLoading: false,
    });
    vi.mocked(fetchNotificationCount).mockResolvedValue(
      notificationCount({
        total: 4,
        pendingPayments: 2,
        underReviewPayments: 1,
        unreadMessages: 1,
        isAdmin: true,
      }),
    );

    const { result } = renderHook(() => useNotificationCount(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(fetchNotificationCount).toHaveBeenCalledWith({
      userId: "admin-123",
      isAdmin: true,
    });
    expect(result.current).toMatchObject({ total: 4, isAdmin: true });
  });

  it("surfaces notification-count query failures", async () => {
    vi.mocked(getCurrentAuthSession).mockResolvedValue(sessionFor("admin-123"));
    vi.mocked(fetchNotificationCount).mockRejectedValue(new Error("database unavailable"));

    const { result } = renderHook(() => useNotificationCount(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeInstanceOf(Error);
    expect(result.current.error?.message).toBe("database unavailable");
  });

  it("subscribes to auth and notification changes through service boundaries", async () => {
    vi.mocked(getCurrentAuthSession).mockResolvedValue(sessionFor("customer-123"));

    renderHook(() => useNotificationCount(), { wrapper });

    await waitFor(() => {
      expect(subscribeToAuthSessionChanges).toHaveBeenCalledTimes(1);
      expect(subscribeToNotificationCountChanges).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: "customer-123",
          isAdmin: false,
          onChange: expect.any(Function),
        }),
      );
    });
  });
});

describe("useFormattedNotificationCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(subscribeToAuthSessionChanges).mockReturnValue(vi.fn());
    vi.mocked(subscribeToNotificationCountChanges).mockReturnValue(vi.fn());
    vi.mocked(useCurrentUserIsAdmin).mockReturnValue({
      data: false,
      isLoading: false,
    });
  });

  it("formats totals above 99 as 99+", async () => {
    vi.mocked(getCurrentAuthSession).mockResolvedValue(sessionFor("user-123"));
    vi.mocked(fetchNotificationCount).mockResolvedValue(
      notificationCount({ total: 150, requiresInfoPayments: 150 }),
    );

    const { result } = renderHook(() => useFormattedNotificationCount(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.formattedTotal).toBe("99+");
    expect(result.current.hasNotifications).toBe(true);
  });

  it("keeps normal totals below 100", async () => {
    vi.mocked(getCurrentAuthSession).mockResolvedValue(sessionFor("user-123"));
    vi.mocked(fetchNotificationCount).mockResolvedValue(
      notificationCount({ total: 2, requiresInfoPayments: 2 }),
    );

    const { result } = renderHook(() => useFormattedNotificationCount(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.formattedTotal).toBe("2");
    expect(result.current.hasNotifications).toBe(true);
  });

  it("reports no notifications at zero", async () => {
    vi.mocked(getCurrentAuthSession).mockResolvedValue(sessionFor("user-123"));
    vi.mocked(fetchNotificationCount).mockResolvedValue(notificationCount());

    const { result } = renderHook(() => useFormattedNotificationCount(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.formattedTotal).toBe("0");
    expect(result.current.hasNotifications).toBe(false);
  });
});
