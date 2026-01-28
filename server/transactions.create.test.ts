import { describe, it, expect } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createTestContext(): TrpcContext {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("Transactions Create", () => {
  it("deve criar uma nova transação de saída (expense)", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.transactions.create({
      type: "expense",
      amount: 150.50,
      category: "Alimentação",
      description: "Almoço no restaurante",
      date: "2026-01-16",
      paymentMethod: "pix",
    });

    expect(result).toBeDefined();
    expect(result.type).toBe("expense");
    expect(parseFloat(result.amount.toString())).toBe(150.50);
    expect(result.category).toBe("Alimentação");
    expect(result.description).toBe("Almoço no restaurante");
    expect(result.paymentMethod).toBe("pix");
  });

  it("deve criar uma nova transação de entrada (income)", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.transactions.create({
      type: "income",
      amount: 5000.00,
      category: "Trabalho",
      description: "Salário mensal",
      date: "2026-01-16",
      paymentMethod: "transferencia",
    });

    expect(result).toBeDefined();
    expect(result.type).toBe("income");
    expect(parseFloat(result.amount.toString())).toBe(5000.00);
    expect(result.category).toBe("Trabalho");
  });

  it("deve criar transação sem descrição (opcional)", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.transactions.create({
      type: "expense",
      amount: 25.00,
      category: "Transporte",
      date: "2026-01-16",
      paymentMethod: "dinheiro",
    });

    expect(result).toBeDefined();
    expect(result.type).toBe("expense");
    expect(parseFloat(result.amount.toString())).toBe(25.00);
  });

  it("deve validar que amount seja positivo", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.transactions.create({
        type: "expense",
        amount: -50.00,
        category: "Alimentação",
        date: "2026-01-16",
        paymentMethod: "pix",
      })
    ).rejects.toThrow();
  });

  it("deve validar que tipo seja income ou expense", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.transactions.create({
        type: "invalid" as any,
        amount: 100.00,
        category: "Alimentação",
        date: "2026-01-16",
        paymentMethod: "pix",
      })
    ).rejects.toThrow();
  });
});
