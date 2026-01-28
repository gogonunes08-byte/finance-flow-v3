import { createTransaction, getTransactions, deleteTransaction, updateTransaction } from "./db";
import type { InsertTransaction } from "../drizzle/schema";
import { sendMessage } from "./whatsapp-auth";
import { notifyTransactionCreated } from "./notifications";

// Armazenar confirmações pendentes em memória (em produção usar Redis)
const pendingConfirmations = new Map<string, {
  type: string;
  data: any;
  timestamp: number;
}>();

interface ParsedCommand {
  type: "gasto" | "entrada" | "saldo" | "listar" | "editar" | "deletar" | "confirmar" | "cancelar" | "unknown";
  amount?: number;
  category?: string;
  method?: string;
  period?: "total" | "hoje";
  transactionId?: number;
  confirmationCode?: string;
}

/**
 * Parsear comando do usuário - Versão 2 com comandos avançados
 */
export function parseCommand(message: string): ParsedCommand {
  const text = message.toLowerCase().trim();

  // Comando: listar
  if (text.startsWith("listar")) {
    return { type: "listar" };
  }

  // Comando: deletar
  if (text.startsWith("deletar")) {
    const parts = text.replace("deletar", "").trim().split(" ");
    const transactionId = parseInt(parts[0]);
    if (!isNaN(transactionId)) {
      return { type: "deletar", transactionId };
    }
  }

  // Comando: editar
  if (text.startsWith("editar")) {
    const parts = text.replace("editar", "").trim().split(" ");
    const transactionId = parseInt(parts[0]);
    const newAmount = parseFloat(parts[1]);
    
    if (!isNaN(transactionId) && !isNaN(newAmount)) {
      return {
        type: "editar",
        transactionId,
        amount: newAmount,
      };
    }
  }

  // Comando: confirmar
  if (text.startsWith("confirmar") || text.startsWith("sim")) {
    const parts = text.split(" ");
    const confirmationCode = parts[1] || "";
    return { type: "confirmar", confirmationCode };
  }

  // Comando: cancelar
  if (text.startsWith("cancelar") || text.startsWith("não")) {
    return { type: "cancelar" };
  }

  // Comando: saldo
  if (text.startsWith("saldo")) {
    const period = text.includes("hoje") ? "hoje" : "total";
    return { type: "saldo", period };
  }

  // Comando: gasto
  if (text.startsWith("gasto")) {
    const parts = text.replace("gasto", "").trim().split(" ");
    const amount = parseFloat(parts[0]);
    const method = parts[parts.length - 1];
    const category = parts.slice(1, -1).join(" ") || "Outros";

    if (!isNaN(amount)) {
      return {
        type: "gasto",
        amount,
        category,
        method,
      };
    }
  }

  // Comando: entrada
  if (text.startsWith("entrada")) {
    const parts = text.replace("entrada", "").trim().split(" ");
    const amount = parseFloat(parts[0]);
    const category = parts.slice(1).join(" ") || "Renda";

    if (!isNaN(amount)) {
      return {
        type: "entrada",
        amount,
        category,
      };
    }
  }

  return { type: "unknown" };
}

/**
 * Gerar código de confirmação
 */
function generateConfirmationCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

/**
 * Processar mensagem com suporte a confirmação
 */
export async function processMessage(
  senderNumber: string,
  messageText: string
): Promise<string> {
  try {
    const command = parseCommand(messageText);

    // Comando: Listar transações
    if (command.type === "listar") {
      const transactions = await getTransactions();
      
      if (transactions.length === 0) {
        return "📋 Nenhuma transação registrada ainda.\n\nUse: gasto 25 mercado pix";
      }

      const recent = transactions.slice(-5).reverse();
      let list = "📋 Últimas 5 Transações:\n\n";
      
      recent.forEach((t: any) => {
        const icon = t.type === "income" ? "📈" : "📉";
        list += `${icon} [ID: ${t.id}] ${t.category}\n`;
        list += `   R$ ${t.amount} | ${t.date}\n`;
      });

      return list;
    }

    // Comando: Deletar transação
    if (command.type === "deletar") {
      if (!command.transactionId) {
        return "❌ Comando inválido. Use: deletar 123";
      }

      const confirmCode = generateConfirmationCode();
      pendingConfirmations.set(senderNumber, {
        type: "deletar",
        data: { transactionId: command.transactionId },
        timestamp: Date.now(),
      });

      return `⚠️ Confirmar exclusão da transação #${command.transactionId}?\n\nResponda: confirmar ${confirmCode}\nOu: cancelar`;
    }

    // Comando: Editar transação
    if (command.type === "editar") {
      if (!command.transactionId || !command.amount) {
        return "❌ Comando inválido. Use: editar 123 50.00";
      }

      const confirmCode = generateConfirmationCode();
      pendingConfirmations.set(senderNumber, {
        type: "editar",
        data: { transactionId: command.transactionId, amount: command.amount },
        timestamp: Date.now(),
      });

      return `⚠️ Confirmar edição da transação #${command.transactionId}?\n\nNovo valor: R$ ${command.amount.toFixed(2)}\n\nResponda: confirmar ${confirmCode}\nOu: cancelar`;
    }

    // Comando: Confirmar
    if (command.type === "confirmar") {
      const pending = pendingConfirmations.get(senderNumber);
      
      if (!pending) {
        return "❌ Nenhuma confirmação pendente.";
      }

      // Verificar timeout (5 minutos)
      if (Date.now() - pending.timestamp > 5 * 60 * 1000) {
        pendingConfirmations.delete(senderNumber);
        return "⏰ Confirmação expirada. Tente novamente.";
      }

      try {
        if (pending.type === "deletar") {
          await deleteTransaction(pending.data.transactionId);
          pendingConfirmations.delete(senderNumber);
          return `✅ Transação #${pending.data.transactionId} deletada com sucesso!`;
        }

        if (pending.type === "editar") {
          const today = new Date().toISOString().split('T')[0];
          await updateTransaction(pending.data.transactionId, {
            amount: pending.data.amount.toString(),
            date: today,
          });
          pendingConfirmations.delete(senderNumber);
          return `✅ Transação #${pending.data.transactionId} atualizada para R$ ${pending.data.amount.toFixed(2)}!`;
        }

        if (pending.type === "gasto" || pending.type === "entrada") {
          const today = new Date().toISOString().split('T')[0];
          const data: InsertTransaction = {
            amount: pending.data.amount.toString(),
            type: pending.type === "gasto" ? "expense" : "income",
            category: pending.data.category,
            paymentMethod: pending.data.method || "outro",
            description: pending.data.description,
            date: today,
          };
          await createTransaction(data);
          const txType = pending.type === 'gasto' ? 'expense' : 'income';
          await notifyTransactionCreated(senderNumber, txType, pending.data.amount, pending.data.category);
          pendingConfirmations.delete(senderNumber);
          
          const icon = pending.type === "gasto" ? "💸" : "💰";
          return `✅ ${icon} ${pending.type === "gasto" ? "Gasto" : "Entrada"} de R$ ${pending.data.amount.toFixed(2)} registrado com sucesso!`;
        }
      } catch (error) {
        console.error("[WhatsApp] Erro ao confirmar:", error);
        pendingConfirmations.delete(senderNumber);
        return "❌ Erro ao processar confirmação. Tente novamente.";
      }
    }

    // Comando: Cancelar
    if (command.type === "cancelar") {
      if (pendingConfirmations.has(senderNumber)) {
        pendingConfirmations.delete(senderNumber);
        return "❌ Operação cancelada.";
      }
      return "❌ Nenhuma operação para cancelar.";
    }

    // Comando: Saldo
    if (command.type === "saldo") {
      const transactions = await getTransactions();

      let totalEntradas = 0;
      let totalSaidas = 0;

      if (command.period === "hoje") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        transactions.forEach((t: any) => {
          const [year, month, day] = t.date.split('-');
          const txDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));

          if (txDate.getTime() === today.getTime()) {
            if (t.type === "income") {
              totalEntradas += parseFloat(t.amount);
            } else {
              totalSaidas += parseFloat(t.amount);
            }
          }
        });
      } else {
        transactions.forEach((t: any) => {
          if (t.type === "income") {
            totalEntradas += parseFloat(t.amount);
          } else {
            totalSaidas += parseFloat(t.amount);
          }
        });
      }

      const saldo = totalEntradas - totalSaidas;
      const periodo = command.period === "hoje" ? "de hoje" : "total";

      return `💰 Saldo ${periodo}:\n\n📈 Entradas: R$ ${totalEntradas.toFixed(2)}\n📉 Saídas: R$ ${totalSaidas.toFixed(2)}\n💵 Saldo: R$ ${saldo.toFixed(2)}`;
    }

    // Comando: Gasto com confirmação
    if (command.type === "gasto") {
      if (!command.amount || !command.category) {
        return "❌ Comando inválido. Use: gasto 25 mercado pix";
      }

      const confirmCode = generateConfirmationCode();
      pendingConfirmations.set(senderNumber, {
        type: "gasto",
        data: {
          amount: command.amount,
          category: command.category,
          method: command.method || "outro",
          description: `${command.category} - ${command.method}`,
        },
        timestamp: Date.now(),
      });

      return `💸 Confirmar gasto?\n\nValor: R$ ${command.amount.toFixed(2)}\nCategoria: ${command.category}\nMétodo: ${command.method}\n\nResponda: confirmar ${confirmCode}\nOu: cancelar`;
    }

    // Comando: Entrada com confirmação
    if (command.type === "entrada") {
      if (!command.amount || !command.category) {
        return "❌ Comando inválido. Use: entrada 100 salário";
      }

      const confirmCode = generateConfirmationCode();
      pendingConfirmations.set(senderNumber, {
        type: "entrada",
        data: {
          amount: command.amount,
          category: command.category,
          description: command.category,
        },
        timestamp: Date.now(),
      });

      return `💰 Confirmar entrada?\n\nValor: R$ ${command.amount.toFixed(2)}\nCategoria: ${command.category}\n\nResponda: confirmar ${confirmCode}\nOu: cancelar`;
    }

    // Comando desconhecido
    return `❓ Comando não reconhecido.\n\n📋 Comandos disponíveis:\n\n💸 gasto 25 mercado pix\n💰 entrada 100 salário\n📊 saldo total\n📊 saldo hoje\n📋 listar\n✏️ editar 123 50\n🗑️ deletar 123`;
  } catch (error) {
    console.error("[WhatsApp] Erro ao processar mensagem:", error);
    return "❌ Erro ao processar sua mensagem. Tente novamente.";
  }
}

/**
 * Enviar resposta para o usuário
 */
export async function sendReply(senderNumber: string, responseText: string) {
  try {
    await sendMessage(senderNumber, responseText);
    console.log(`[WhatsApp] Resposta enviada para ${senderNumber}`);
  } catch (error) {
    console.error("[WhatsApp] Erro ao enviar resposta:", error);
  }
}
