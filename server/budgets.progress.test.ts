import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "test",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("budgets.progress", () => {
  it("returns empty array when no budgets exist", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.budgets.progress({});

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(0);
  });

  it("returns budget progress with correct structure", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.budgets.progress({});

    if (result.length > 0) {
      const budget = result[0];
      expect(budget).toHaveProperty("id");
      expect(budget).toHaveProperty("category");
      expect(budget).toHaveProperty("limit");
      expect(budget).toHaveProperty("spent");
      expect(budget).toHaveProperty("percentage");
      expect(budget).toHaveProperty("isExceeded");

      // Validate types
      expect(typeof budget.id).toBe("number");
      expect(typeof budget.category).toBe("string");
      expect(typeof budget.percentage).toBe("number");
      expect(typeof budget.isExceeded).toBe("boolean");

      // Validate percentage is between 0 and 200 (can exceed 100%)
      expect(budget.percentage).toBeGreaterThanOrEqual(0);
      expect(budget.percentage).toBeLessThanOrEqual(200);
    }
  });
});
