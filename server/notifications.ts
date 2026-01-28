import { getBudgets, getTransactions } from "./db";
import { sendMessage } from "./whatsapp-auth";

interface Notification {
  id: string;
  type: "budget_alert" | "transaction_created" | "daily_summary";
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

// Armazenar notificações em memória (em produção usar banco de dados)
const notifications = new Map<string, Notification[]>();

/**
 * Verificar se atingiu meta de gasto
 */
export async function checkBudgetAlerts(senderNumber: string): Promise<string | null> {
  try {
    const budgets = await getBudgets();
    const transactions = await getTransactions();

    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM

    for (const budget of budgets) {
      if (budget.month !== currentMonth) continue;

      // Calcular gasto do mês na categoria
      let categorySpent = 0;
      transactions.forEach((t: any) => {
        if (t.category === budget.category && t.type === "expense" && t.date.startsWith(currentMonth)) {
          categorySpent += parseFloat(t.amount);
        }
      });

      const limit = parseFloat(budget.limit);
      const percentage = (categorySpent / limit) * 100;

      // Alertar se atingiu 80%, 100% ou ultrapassou
      if (percentage >= 100) {
        return `⚠️ ALERTA: Você ultrapassou a meta de ${budget.category}!\n\nMeta: R$ ${limit.toFixed(2)}\nGasto: R$ ${categorySpent.toFixed(2)}\nExcesso: R$ ${(categorySpent - limit).toFixed(2)}`;
      } else if (percentage >= 80) {
        return `⚠️ ATENÇÃO: Você está próximo da meta de ${budget.category}!\n\nMeta: R$ ${limit.toFixed(2)}\nGasto: R$ ${categorySpent.toFixed(2)}\nRestante: R$ ${(limit - categorySpent).toFixed(2)}`;
      }
    }

    return null;
  } catch (error) {
    console.error("[Notifications] Erro ao verificar orçamento:", error);
    return null;
  }
}

/**
 * Enviar notificação de transação criada
 */
export async function notifyTransactionCreated(
  senderNumber: string,
  type: "income" | "expense",
  amount: number,
  category: string
): Promise<void> {
  try {
    const icon = type === "income" ? "📈" : "📉";
    const message = `${icon} Nova ${type === "income" ? "entrada" : "saída"} registrada!\n\nValor: R$ ${amount.toFixed(2)}\nCategoria: ${category}`;

    await sendMessage(senderNumber, message);

    // Verificar alertas de orçamento
    const budgetAlert = await checkBudgetAlerts(senderNumber);
    if (budgetAlert) {
      await sendMessage(senderNumber, budgetAlert);
    }

    // Armazenar notificação
    storeNotification(senderNumber, {
      type: "transaction_created",
      title: `${type === "income" ? "Entrada" : "Saída"} de R$ ${amount.toFixed(2)}`,
      message: `${category} - ${new Date().toLocaleString("pt-BR")}`,
    });
  } catch (error) {
    console.error("[Notifications] Erro ao notificar transação:", error);
  }
}

/**
 * Enviar resumo diário
 */
export async function sendDailySummary(senderNumber: string): Promise<void> {
  try {
    const transactions = await getTransactions();
    const today = new Date().toISOString().split("T")[0];

    let totalEntradas = 0;
    let totalSaidas = 0;
    let transactionCount = 0;

    transactions.forEach((t: any) => {
      if (t.date === today) {
        transactionCount++;
        if (t.type === "income") {
          totalEntradas += parseFloat(t.amount);
        } else {
          totalSaidas += parseFloat(t.amount);
        }
      }
    });

    const saldo = totalEntradas - totalSaidas;
    const message = `📊 Resumo de Hoje:\n\n📈 Entradas: R$ ${totalEntradas.toFixed(2)}\n📉 Saídas: R$ ${totalSaidas.toFixed(2)}\n💵 Saldo: R$ ${saldo.toFixed(2)}\n\n📋 Transações: ${transactionCount}`;

    await sendMessage(senderNumber, message);

    storeNotification(senderNumber, {
      type: "daily_summary",
      title: "Resumo Diário",
      message: `${transactionCount} transações | Saldo: R$ ${saldo.toFixed(2)}`,
    });
  } catch (error) {
    console.error("[Notifications] Erro ao enviar resumo:", error);
  }
}

/**
 * Armazenar notificação localmente
 */
function storeNotification(
  senderNumber: string,
  notification: Omit<Notification, "id" | "timestamp" | "read">
): void {
  if (!notifications.has(senderNumber)) {
    notifications.set(senderNumber, []);
  }

  const userNotifications = notifications.get(senderNumber)!;
  userNotifications.push({
    id: Math.random().toString(36).substring(7),
    ...notification,
    timestamp: new Date(),
    read: false,
  });

  // Manter apenas últimas 50 notificações
  if (userNotifications.length > 50) {
    userNotifications.shift();
  }
}

/**
 * Obter notificações do usuário
 */
export function getNotifications(senderNumber: string): Notification[] {
  return notifications.get(senderNumber) || [];
}

/**
 * Marcar notificação como lida
 */
export function markAsRead(senderNumber: string, notificationId: string): void {
  const userNotifications = notifications.get(senderNumber);
  if (userNotifications) {
    const notification = userNotifications.find((n) => n.id === notificationId);
    if (notification) {
      notification.read = true;
    }
  }
}

/**
 * Limpar notificações antigas (executar periodicamente)
 */
export function cleanupOldNotifications(): void {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  notifications.forEach((userNotifications, senderNumber) => {
    const filtered = userNotifications.filter((n) => n.timestamp > oneWeekAgo);
    if (filtered.length === 0) {
      notifications.delete(senderNumber);
    } else {
      notifications.set(senderNumber, filtered);
    }
  });
}

// Executar limpeza a cada 6 horas
setInterval(cleanupOldNotifications, 6 * 60 * 60 * 1000);
