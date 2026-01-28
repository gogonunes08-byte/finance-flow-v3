
import cron from "node-cron";
import { driveService } from "./drive";
import { getUserWithToken } from "../db";

export function initScheduler() {
    console.log("[Scheduler] ⏳ Inicializando agendador de tarefas...");

    // Schedule task to run at 23:00 every day
    cron.schedule("0 23 * * *", async () => {
        console.log("[Scheduler] 🕛 Executando backup automático das 23h...");

        try {
            const user = await getUserWithToken();

            if (!user || !user.googleAccessToken) {
                console.warn("[Scheduler] ⚠️ Backup pulado: Nenhum usuário com token encontrado.");
                return;
            }

            await driveService.uploadBackup(user.googleAccessToken);
            console.log("[Scheduler] ✅ Backup automático concluído com sucesso!");
        } catch (error) {
            console.error("[Scheduler] ❌ Falha no backup automático:", error);
        }
    });

    console.log("[Scheduler] ✅ Agendador ativo (Backup diário às 23:00)");
}
