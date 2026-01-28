
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import fs from "fs";
import path from "path";
import { transactions, categories, paymentMethods } from "../drizzle/schema"; // Adjust path if needed
import { eq } from "drizzle-orm";

// Adjust path to point to the correct file
const BACKUP_FILE = path.join(process.cwd(), "temp", "finance_flow_backup_2026-01-27_23-00.json");

const { Pool } = pg;

async function main() {
    if (!process.env.DATABASE_URL) {
        console.error("❌ DATABASE_URL is missing in .env");
        process.exit(1);
    }

    if (!fs.existsSync(BACKUP_FILE)) {
        console.error(`❌ Backup file not found at ${BACKUP_FILE}`);
        process.exit(1);
    }

    console.log("🔌 Connecting to Postgres...");
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });
    const db = drizzle(pool);

    console.log("📂 Reading backup...");
    const rawData = fs.readFileSync(BACKUP_FILE, "utf-8");
    const data = JSON.parse(rawData);
    const txs = data.transactions || [];

    console.log(`📊 Found ${txs.length} transactions.`);

    // 1. Extract and Insert Categories
    console.log("📦 Restoring Categories...");
    const uniqueCategories = new Set<string>();
    txs.forEach((t: any) => {
        if (t.category) uniqueCategories.add(t.category);
    });

    for (const catName of uniqueCategories) {
        const existing = await db.select().from(categories).where(eq(categories.name, catName));
        if (existing.length === 0) {
            await db.insert(categories).values({
                name: catName,
                icon: "circle", // Default icon
                color: "#6366f1", // Default color
            });
        }
    }

    // 2. Extract and Insert Payment Methods
    console.log("💳 Restoring Payment Methods...");
    const uniquePM = new Set<string>();
    txs.forEach((t: any) => {
        if (t.paymentMethod) uniquePM.add(t.paymentMethod);
    });

    for (const pmName of uniquePM) {
        const existing = await db.select().from(paymentMethods).where(eq(paymentMethods.name, pmName));
        if (existing.length === 0) {
            await db.insert(paymentMethods).values({
                name: pmName,
                icon: "credit-card", // Default
            });
        }
    }

    // 3. Insert Transactions
    console.log("💸 Restoring Transactions...");

    // Batch insert could be faster but let's do sequential for safety with specific field mapping
    let inserted = 0;
    for (const t of txs) {
        // Check if ID exists to avoid duplicates if running multiple times
        // Note: t.id is from SQLite. We can explicitly insert it into Serial column in Postgres usually,
        // but schema might conflict if sequence is lower.
        // Drizzle/Postgres usually allows explicit ID insert.

        const existing = await db.select().from(transactions).where(eq(transactions.id, t.id));
        if (existing.length > 0) {
            // Skip or Update? Skip for now.
            continue;
        }

        await db.insert(transactions).values({
            id: t.id, // Keep old ID
            type: t.type,
            amount: t.amount.toString(),
            category: t.category,
            description: t.description,
            date: t.date, // Assumes YYYY-MM-DD
            paymentMethod: t.paymentMethod,
            isRecurring: t.isRecurring,
            createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
            updatedAt: t.updatedAt ? new Date(t.updatedAt) : new Date(),
        });
        inserted++;
    }

    console.log(`✅ Restored ${inserted} new transactions.`);

    // 4. Reset Sequence (Important because we inserted IDs manually!)
    console.log("🔧 Fixing Auto-Increment Sequences...");
    try {
        await pool.query(`SELECT setval('transactions_id_seq', (SELECT MAX(id) FROM transactions));`);
        await pool.query(`SELECT setval('categories_id_seq', (SELECT MAX(id) FROM categories));`);
        await pool.query(`SELECT setval('"paymentMethods_id_seq"', (SELECT MAX(id) FROM "paymentMethods"));`); // paymentMethods usually forced to lower or quotes
        // Try both naming conventions just in case drizzle behavior
        await pool.query(`SELECT setval('"paymentMethods_id_seq"', (SELECT MAX(id) FROM "paymentMethods"));`).catch(() => { });
    } catch (e) {
        console.warn("⚠️ Warning: Could not reset sequences automatically. New items might have ID conflict if not fixed.", e);
    }

    console.log("🎉 Migration Complete!");
    process.exit(0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
