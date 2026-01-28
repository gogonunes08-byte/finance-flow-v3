
import fs from "fs";
import path from "path";

async function forceReset() {
    const authPath = path.resolve(process.cwd(), ".wwebjs_auth");

    console.log("🧹 Iniciando limpeza forçada do WhatsApp...");

    if (fs.existsSync(authPath)) {
        try {
            console.log(`📂 Pasta encontrada: ${authPath}`);
            fs.rmSync(authPath, { recursive: true, force: true });
            console.log("✅ Pasta de sessão .wwebjs_auth removida com sucesso!");
        } catch (error: any) {
            console.error(`❌ Erro ao remover pasta: ${error.message}`);
            console.log("⚠️  O servidor ainda está rodando e segurando o arquivo.");
            console.log("👉 SOLUÇÃO: Pare o servidor (Ctrl+C), rode este script novamente e depois inicie o servidor.");
            process.exit(1);
        }
    } else {
        console.log("ℹ️ Nenhuma pasta de sessão encontrada. O WhatsApp já está limpo.");
    }
}

forceReset();
