import { eq, and, between, desc, inArray, isNotNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from 'pg';
import { InsertUser, users, transactions, categories, paymentMethods, budgets, userSettings, tags, transactionTags, type Transaction, type InsertTransaction, type Category, type InsertCategory, type PaymentMethod, type InsertPaymentMethod, type Budget, type InsertBudget, type UserSettings, type Tag, type InsertTag, type TransactionTag, type InsertTransactionTag } from "../drizzle/schema";
import { ENV } from './_core/env';

const { Pool } = pg;

// Connection Pool
let _pool: pg.Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      if (!_pool) {
        _pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: { rejectUnauthorized: false } // Required for Neon/Vercel
        });
      }
      _db = drizzle(_pool);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============ UTILS ============

// Helper to handle date ranges in Postgres (date is stored as string YYYY-MM-DD)
// With text dates, simple gt/lt works fine if format is standard.
function dateBetween(col: any, start: string, end: string) {
  return and(
    // we can use sql template if needed, but standard 'between' might conflict with string
    // but 'between' in drizzle usually generates SQL BETWEEN which works for strings too
    between(col, start, end)
  );
}


// ... (The rest of the CRUD functions need minimal changes since Drizzle abstracts SQL)
// We will just copy the existing logic but using the new getDb structure


export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required");
  const db = await getDb();
  if (!db) return;

  try {
    const existing = await db.select().from(users).where(eq(users.openId, user.openId)).limit(1);

    if (existing.length > 0) {
      // Update
      const updates: any = { ...user };
      delete updates.openId; // Don't update PK/UK
      updates.updatedAt = new Date(); // Autoupdate

      await db.update(users).set(updates).where(eq(users.openId, user.openId));
    } else {
      // Insert
      await db.insert(users).values(user);
    }
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserWithToken() {
  const db = await getDb();
  if (!db) return undefined;
  const [user] = await db.select().from(users).where(isNotNull(users.googleAccessToken)).limit(1);
  return user;
}

export async function getTransactions(filters?: {
  type?: "income" | "expense";
  category?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return [];

  const conditions = [];

  if (filters?.type) conditions.push(eq(transactions.type, filters.type));
  if (filters?.category) conditions.push(eq(transactions.category, filters.category));
  if (filters?.startDate && filters?.endDate) {
    conditions.push(between(transactions.date, filters.startDate, filters.endDate));
  }

  const query = db.select().from(transactions);
  const withConditions = conditions.length > 0 ? query.where(and(...conditions)) : query;
  const withOrder = withConditions.orderBy(desc(transactions.date));
  const withLimit = filters?.limit ? withOrder.limit(filters.limit) : withOrder;
  const final = filters?.offset ? withLimit.offset(filters.offset) : withLimit;

  return await final;
}

export async function getTransactionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(transactions).where(eq(transactions.id, id)).limit(1);
  return result[0];
}

export async function createTransaction(data: InsertTransaction) {
  const db = await getDb();
  if (!db) throw new Error("DB Error");

  const result = await db.insert(transactions).values(data).returning();
  return result[0]; // Postgres returns the object directly
}

export async function updateTransaction(id: number, data: Partial<InsertTransaction>) {
  const db = await getDb();
  if (!db) throw new Error("DB Error");

  const result = await db.update(transactions).set({ ...data, updatedAt: new Date() }).where(eq(transactions.id, id)).returning();
  return result[0];
}

export async function deleteTransaction(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB Error");
  await db.delete(transactions).where(eq(transactions.id, id));
}

export async function getTransactionStats(startDate?: string, endDate?: string) {
  const db = await getDb();
  if (!db) return { totalIncome: 0, totalExpense: 0, balance: 0, count: 0 };

  const conditions = [];
  if (startDate && endDate) {
    conditions.push(between(transactions.date, startDate, endDate));
  }
  const query = db.select().from(transactions);
  const filtered = conditions.length > 0 ? query.where(and(...conditions)) : query;
  const allTransactions = await filtered;

  const totalIncome = allTransactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

  const totalExpense = allTransactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + parseFloat(t.amount.toString()), 0);

  return {
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    count: allTransactions.length,
  };
}

export async function getTransactionsByCategory(startDate?: string, endDate?: string) {
  const all = await getTransactions({ startDate, endDate }); // Reusing logic

  const categoryMap = new Map<string, { total: number; count: number }>();
  all.forEach(t => {
    const existing = categoryMap.get(t.category) || { total: 0, count: 0 };
    categoryMap.set(t.category, {
      total: existing.total + parseFloat(t.amount.toString()),
      count: existing.count + 1,
    });
  });

  return Array.from(categoryMap.entries()).map(([category, data]) => ({
    category,
    total: data.total,
    count: data.count,
  }));
}

export async function getCategories() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(categories);
}

export async function createCategory(data: InsertCategory) {
  const db = await getDb();
  if (!db) return;
  return await db.insert(categories).values(data);
}

export async function autoCategorizeTransaction(description: string): Promise<string> {
  const db = await getDb();
  if (!db) return "Outros";

  const allCats = await db.select().from(categories);
  const lower = description.toLowerCase();

  for (const cat of allCats) {
    if (cat.keywords) {
      try {
        const kws = JSON.parse(cat.keywords);
        if (kws.some((k: string) => lower.includes(k.toLowerCase()))) return cat.name;
      } catch { }
    }
  }
  return "Outros";
}

export async function getPaymentMethods() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(paymentMethods);
}

export async function createPaymentMethod(data: InsertPaymentMethod) {
  const db = await getDb();
  if (!db) return;
  return await db.insert(paymentMethods).values(data);
}

export async function getBudgets(month?: string) {
  const db = await getDb();
  if (!db) return [];

  const m = month || new Date().toISOString().slice(0, 7);
  return await db.select().from(budgets).where(eq(budgets.month, m));
}

export async function createBudget(data: InsertBudget) {
  const db = await getDb();
  if (!db) return;
  return await db.insert(budgets).values(data).returning();
}

export async function updateBudget(id: number, data: Partial<InsertBudget>) {
  const db = await getDb();
  if (!db) return;
  return await db.update(budgets).set(data).where(eq(budgets.id, id)).returning();
}

export async function deleteBudget(id: number) {
  const db = await getDb();
  if (!db) return;
  return await db.delete(budgets).where(eq(budgets.id, id));
}

export async function getBudgetProgress(month?: string) {
  const currentMonth = month || new Date().toISOString().slice(0, 7);
  const [y, m] = currentMonth.split("-");
  const start = `${y}-${m}-01`;
  // End date logic...
  const nextM = new Date(parseInt(y), parseInt(m), 1);
  const end = new Date(nextM.getTime() - 1).toISOString().slice(0, 10);

  const db = await getDb();
  if (!db) return [];

  const monthBudgets = await db.select().from(budgets).where(eq(budgets.month, currentMonth));
  const catExpenses = await getTransactionsByCategory(start, end);

  return monthBudgets.map(b => {
    const expense = catExpenses.find(c => c.category === b.category);
    const spent = expense ? expense.total : 0;
    const limit = parseFloat(b.limit.toString());
    return {
      id: b.id,
      category: b.category,
      limit,
      spent,
      remaining: Math.max(0, limit - spent),
      percentage: Math.min(100, (spent / limit) * 100),
      isExceeded: spent > limit
    };
  });
}

// User Settings & Tags follow same pattern
export async function getUserSettings(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const res = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  return res[0] || null;
}

export async function updateUserSettings(userId: number, limit: number) {
  const db = await getDb();
  if (!db) return;

  // Upsert logic for PG
  // PG supports onConflictDoUpdate but simple check works universally
  const existing = await getUserSettings(userId);
  if (existing) {
    await db.update(userSettings).set({ globalSpendingLimit: limit.toString() }).where(eq(userSettings.userId, userId));
  } else {
    await db.insert(userSettings).values({ userId, globalSpendingLimit: limit.toString() });
  }
}

export async function getTags() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(tags);
}

export async function createTag(data: InsertTag) {
  const db = await getDb();
  if (!db) return;
  return await db.insert(tags).values(data).returning();
}

export async function getTagById(id: number) {
  const db = await getDb();
  if (!db) return;
  const r = await db.select().from(tags).where(eq(tags.id, id));
  return r[0];
}

export async function deleteTag(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(transactionTags).where(eq(transactionTags.tagId, id));
  await db.delete(tags).where(eq(tags.id, id));
}

export async function addTagToTransaction(tId: number, tagId: number) {
  const db = await getDb();
  if (!db) return;
  // check existence
  const exists = await db.select().from(transactionTags).where(and(eq(transactionTags.transactionId, tId), eq(transactionTags.tagId, tagId)));
  if (!exists.length) await db.insert(transactionTags).values({ transactionId: tId, tagId });
}

export async function removeTagFromTransaction(tId: number, tagId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(transactionTags).where(and(eq(transactionTags.transactionId, tId), eq(transactionTags.tagId, tagId)));
}

export async function getTransactionTags(tId: number) {
  const db = await getDb();
  if (!db) return [];

  const links = await db.select().from(transactionTags).where(eq(transactionTags.transactionId, tId));
  if (!links.length) return [];

  return await db.select().from(tags).where(inArray(tags.id, links.map(l => l.tagId)));
}
