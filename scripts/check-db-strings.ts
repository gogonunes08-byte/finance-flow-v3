
import { getDb } from "../server/db";
import { transactions, categories, paymentMethods } from "../server/drizzle/schema";
import { ilike, or } from "drizzle-orm";

async function check() {
    const db = await getDb();
    if (!db) {
        console.log("No DB connection");
        return;
    }

    console.log("Checking transactions...");
    const weirdTransactions = await db.select().from(transactions).where(
        or(
            ilike(transactions.description, "%acontece%"),
            ilike(transactions.category, "%acontece%"),
            ilike(transactions.paymentMethod, "%acontece%")
        )
    );
    console.log("Weird Transactions:", weirdTransactions);

    console.log("Checking categories...");
    const weirdCategories = await db.select().from(categories).where(
        ilike(categories.name, "%acontece%")
    );
    console.log("Weird Categories:", weirdCategories);

    process.exit(0);
}

check();
