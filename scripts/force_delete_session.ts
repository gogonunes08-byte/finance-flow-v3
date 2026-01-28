
import fs from "fs";
import path from "path";

const authPath = path.resolve(process.cwd(), ".wwebjs_auth");

console.log(`🗑️ Tentando remover pasta de sessão: ${authPath}`);

if (fs.existsSync(authPath)) {
    try {
        fs.rmSync(authPath, { recursive: true, force: true });
        console.log("✅ Pasta removida com sucesso! O caminho está livre.");
    } catch (error: any) {
        console.error(`❌ Erro ao remover pasta: ${error.message}`);
        console.log("⚠️ Ainda há processos travando o arquivo. Reinicie o computador se persistir.");
    }
} else {
    console.log("ℹ️ Pasta já não existe. Tudo limpo.");
}
