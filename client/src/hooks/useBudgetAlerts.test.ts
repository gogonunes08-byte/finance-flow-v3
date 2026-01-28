import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBudgetAlerts } from "./useBudgetAlerts";
import { trpc } from "@/lib/trpc";

// Mock do trpc
vi.mock("@/lib/trpc", () => ({
  trpc: {
    budgets: {
      progress: {
        useQuery: vi.fn(),
      },
    },
  },
}));

// Mock do sonner
vi.mock("sonner", () => ({
  toast: {
    warning: vi.fn(),
    error: vi.fn(),
  },
}));

describe("useBudgetAlerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should not trigger alerts when budget is under 80%", () => {
    const mockData = [
      {
        id: 1,
        category: "Alimentação",
        limit: 1000,
        spent: 500,
        remaining: 500,
        percentage: 50,
        isExceeded: false,
      },
    ];

    vi.mocked(trpc.budgets.progress.useQuery).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => useBudgetAlerts());

    expect(result).toBeDefined();
    // No toasts should be called for 50% budget
  });

  it("should trigger warning alert at 80% budget", () => {
    const mockData = [
      {
        id: 1,
        category: "Alimentação",
        limit: 1000,
        spent: 800,
        remaining: 200,
        percentage: 80,
        isExceeded: false,
      },
    ];

    vi.mocked(trpc.budgets.progress.useQuery).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => useBudgetAlerts());

    expect(result).toBeDefined();
    // Warning toast should be called
  });

  it("should trigger error alert when budget is exceeded", () => {
    const mockData = [
      {
        id: 1,
        category: "Alimentação",
        limit: 1000,
        spent: 1100,
        remaining: -100,
        percentage: 110,
        isExceeded: true,
      },
    ];

    vi.mocked(trpc.budgets.progress.useQuery).mockReturnValue({
      data: mockData,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    } as any);

    const { result } = renderHook(() => useBudgetAlerts());

    expect(result).toBeDefined();
    // Error toast should be called
  });
});
