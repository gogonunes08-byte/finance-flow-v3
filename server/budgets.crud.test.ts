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

describe("budgets.crud", () => {
  it("creates a new budget", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.budgets.create({
      category: "Alimentação",
      limit: 1000,
      month: "2025-01",
    });

    expect(result).toEqual({ success: true });
  });

  it("lists budgets", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.budgets.list({});

    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      const budget = result[0];
      expect(budget).toHaveProperty("id");
      expect(budget).toHaveProperty("category");
      expect(budget).toHaveProperty("limit");
    }
  });

  it("deletes a budget", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create a budget first
    await caller.budgets.create({
      category: "Transporte",
      limit: 500,
      month: "2025-01",
    });

    // Get the list to find the ID
    const budgets = await caller.budgets.list({});
    
    if (budgets.length > 0) {
      const budgetToDelete = budgets[0];
      const budgetId = typeof budgetToDelete.id === "number" ? budgetToDelete.id : parseInt(String(budgetToDelete.id));

      // Delete it
      const result = await caller.budgets.delete({ id: budgetId });

      expect(result).toEqual({ success: true });
    }
  });
});
