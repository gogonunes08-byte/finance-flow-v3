
import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
    users,
    transactions,
    categories,
    paymentMethods,
    budgets,
    userSettings,
    tags,
    transactionTags,
} from "../drizzle/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("DATABASE_URL is required");
    }

    const connection = await mysql.createConnection(connectionString);
    const db = drizzle(connection);

    const dataPath = path.resolve(__dirname, "../banco de dados/DATABASE_EXPORT_SAMPLE.json");

    if (!fs.existsSync(dataPath)) {
        console.error(`❌ Arquivo de dados não encontrado em: ${dataPath}`);
        process.exit(1);
    }

    console.log(`📦 Lendo dados de: ${dataPath}`);
    const rawData = fs.readFileSync(dataPath, "utf-8");
    const data = JSON.parse(rawData);

    console.log("🔄 Iniciando importação...");

    // Importar Usuários
    if (data.users && data.users.length > 0) {
        console.log(`👤 Importando ${data.users.length} usuários...`);
        await db.insert(users).values(data.users.map((u: any) => ({
            ...u,
            createdAt: new Date(u.createdAt),
            updatedAt: new Date(u.updatedAt),
            lastSignedIn: new Date(u.lastSignedIn),
        }))).onDuplicateKeyUpdate({ set: { id: parseInt(data.users[0].id) } }); // Dummy update to avoid error
        // Note: onDuplicateKeyUpdate is a hack here, ideally strictly insert or update.
    }

    // Importar Categorias
    if (data.categories && data.categories.length > 0) {
        console.log(`📂 Importando ${data.categories.length} categorias...`);
        // Delete existing to avoid conflicts if IDs match
        await db.delete(categories);
        await db.insert(categories).values(data.categories.map((c: any) => ({
            ...c,
            keywords: c.keywords, // Already a string in JSON? Check if need to stringify
            createdAt: new Date(c.createdAt),
        })));
    }

    // Importar Métodos de Pagamento
    if (data.paymentMethods && data.paymentMethods.length > 0) {
        console.log(`💳 Importando ${data.paymentMethods.length} métodos de pagamento...`);
        await db.delete(paymentMethods);
        await db.insert(paymentMethods).values(data.paymentMethods.map((p: any) => ({
            ...p,
            createdAt: new Date(p.createdAt),
        })));
    }

    // Importar Transações
    if (data.transactions && data.transactions.length > 0) {
        console.log(`💸 Importando ${data.transactions.length} transações...`);
        await db.delete(transactions);
        await db.insert(transactions).values(data.transactions.map((t: any) => ({
            ...t,
            createdAt: new Date(t.createdAt),
            updatedAt: new Date(t.updatedAt),
        })));
    }

    // Importar Budgets
    if (data.budgets && data.budgets.length > 0) {
        console.log(`🎯 Importando ${data.budgets.length} budgets...`);
        await db.delete(budgets);
        await db.insert(budgets).values(data.budgets.map((b: any) => ({
            ...b,
            createdAt: new Date(b.createdAt),
            updatedAt: new Date(b.updatedAt),
        })));
    }

    // Importar Tags
    if (data.tags && data.tags.length > 0) {
        console.log(`🏷️ Importando ${data.tags.length} tags...`);
        await db.delete(tags);
        await db.insert(tags).values(data.tags.map((t: any) => ({
            ...t,
            createdAt: new Date(t.createdAt),
        })));
    }

    // Importar Transaction Tags
    if (data.transactionTags && data.transactionTags.length > 0) {
        console.log(`🔗 Importando ${data.transactionTags.length} relações de tags...`);
        await db.delete(transactionTags);
        await db.insert(transactionTags).values(data.transactionTags.map((tt: any) => ({
            ...tt,
            createdAt: new Date(tt.createdAt),
        })));
    }

    // Importar User Settings
    if (data.userSettings && data.userSettings.length > 0) {
        console.log(`⚙️ Importando ${data.userSettings.length} configurações de usuário...`);
        await db.delete(userSettings);
        await db.insert(userSettings).values(data.userSettings.map((us: any) => ({
            ...us,
            createdAt: new Date(us.createdAt),
            updatedAt: new Date(us.updatedAt),
        })));
    }

    console.log("✅ Importação concluída com sucesso!");
    await connection.end();
}

main().catch((err) => {
    console.error("❌ Erro na importação:", err);
    process.exit(1);
});
