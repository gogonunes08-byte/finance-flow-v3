
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

console.log("🧹 Iniciando Limpeza Geral do Ambiente...");

// 1. Matar processos Node e Chrome (Zombie processes)
try {
    console.log("🔪 Matando processos 'node.exe' fantasmas...");
    // /F = Force, /IM = Image Name
    // Ignoramos erro se não encontrar processo
    try { execSync("taskkill /F /IM node.exe"); } catch (e) { /* ignore */ }
} catch (e) {
    console.log("⚠️  Não foi possível matar node.exe (talvez eu tenha me matado? 😅)");
}

try {
    console.log("🔪 Matando processos 'chrome.exe' fantasmas...");
    try { execSync("taskkill /F /IM chrome.exe"); } catch (e) { /* ignore */ }
} catch (e) {
    console.log("⚠️  Erro ao matar chrome.exe");
}

// 2. Apagar pasta de sessão
const authPath = path.resolve(process.cwd(), ".wwebjs_auth");
if (fs.existsSync(authPath)) {
    console.log(`🗑️  Removendo pasta de sessão: ${authPath}`);
    try {
        fs.rmSync(authPath, { recursive: true, force: true });
        console.log("✅ Pasta removida com sucesso!");
    } catch (error: any) {
        console.error(`❌ Erro ao remover pasta: ${error.message}`);
        console.log("   (Isso não deveria acontecer se os processos foram mortos)");
    }
} else {
    console.log("ℹ️  Pasta de sessão já não existia.");
}

console.log("\n✨ Ambiente Limpo! Tente rodar 'pnpm run dev' agora.");
// O script vai morrer aqui porque matamos o node, mas tudo bem.
