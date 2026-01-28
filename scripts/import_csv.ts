
import "dotenv/config";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { transactions } from "../drizzle/schema";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        throw new Error("DATABASE_URL is required");
    }

    const connection = await mysql.createConnection(connectionString);
    const db = drizzle(connection);

    const csvPath = path.resolve(__dirname, "../banco de dados/ALL_TRANSACTIONS_128.csv");

    if (!fs.existsSync(csvPath)) {
        console.error(`❌ Arquivo CSV não encontrado em: ${csvPath}`);
        process.exit(1);
    }

    console.log(`📦 Lendo CSV de: ${csvPath}`);
    const rawData = fs.readFileSync(csvPath, "utf-8");
    const lines = rawData.split("\n").filter(line => line.trim() !== "");

    // Headers: id,type,amount,category,description,date,paymentMethod,createdAt,updatedAt
    const headers = lines[0].split(",");
    const dataRows = lines.slice(1);

    if (dataRows.length === 0) {
        console.log("⚠️ Nenhuma transação encontrada no CSV.");
        process.exit(0);
    }

    let totalIncome = 0;
    let totalExpense = 0;

    const transactionsToInsert = dataRows.map(row => {
        // Handle CSV parsing (simple split by comma, assuming no commas in fields for now based on sample)
        // If description has comma, this simple split might fail. But looking at sample, simple descriptions.
        // Better to be robust: regex or simple split. Just split for now.
        const cols = row.split(",");

        // Mapping based on headers index
        const id = parseInt(cols[0]);
        const type = cols[1] as "income" | "expense";
        const amount = parseFloat(cols[2]);
        const category = cols[3];
        const description = cols[4];
        const date = cols[5];
        const paymentMethod = cols[6];
        const createdAt = cols[7] ? new Date(cols[7]) : new Date();
        const updatedAt = cols[8] ? new Date(cols[8].trim()) : new Date();

        if (type === "income") {
            totalIncome += amount;
        } else if (type === "expense") {
            totalExpense += amount;
        }

        return {
            type,
            amount: amount.toFixed(2), // Ensure string format for decimal
            category,
            description,
            date,
            paymentMethod,
            createdAt,
            updatedAt,
        };
    });

    const balance = totalIncome - totalExpense;

    const report = `
📊 CÁLCULO ATUALIZADO (Baseado em ${transactionsToInsert.length} transações):
💰 Total Entradas: R$ ${totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
💸 Total Saídas:   R$ ${totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
🏦 Saldo Atual:    R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
  `;

    console.log(report);
    fs.writeFileSync(path.resolve(__dirname, "../balance_report.txt"), report);

    console.log("🔄 Iniciando importação no banco de dados...");

    // Limpar transações antigas
    await db.delete(transactions);

    // Inserir novas em lotes para evitar payload connection limits se for muito grande
    // 128 é pequeno, pode ir tudo de uma vez
    await db.insert(transactions).values(transactionsToInsert as any);

    console.log(`✅ ${transactionsToInsert.length} transações importadas com sucesso!`);

    await connection.end();
}

main().catch((err) => {
    console.error("❌ Erro na importação:", err);
    process.exit(1);
});
