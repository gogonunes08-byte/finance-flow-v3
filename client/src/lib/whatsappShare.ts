/**
 * Utilitários para compartilhar transações no WhatsApp
 */

export interface Transaction {
  id: number;
  type: "income" | "expense";
  amount: number;
  category: string;
  description: string;
  paymentMethod: string;
  date: Date | string;
}

/**
 * Gera mensagem formatada para compartilhar transação
 */
export function formatTransactionMessage(transaction: Transaction): string {
  const isIncome = transaction.type === "income";
  const emoji = isIncome ? "💰" : "💸";
  const typeLabel = isIncome ? "Entrada" : "Saída";
  const amount = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(transaction.amount);

  const date = new Date(transaction.date).toLocaleDateString("pt-BR");

  return `${emoji} *${typeLabel}*

💵 Valor: ${amount}
📂 Categoria: ${transaction.category}
📝 Descrição: ${transaction.description}
💳 Método: ${transaction.paymentMethod}
📅 Data: ${date}

_Compartilhado via Finance Flow Pro_`;
}

/**
 * Gera link para compartilhar no WhatsApp
 */
export function generateWhatsAppShareLink(transaction: Transaction): string {
  const message = formatTransactionMessage(transaction);
  const encodedMessage = encodeURIComponent(message);

  // Link para WhatsApp Web (sem número específico)
  return `https://wa.me/?text=${encodedMessage}`;
}

/**
 * Gera link para compartilhar com número específico
 */
export function generateWhatsAppShareLinkWithNumber(
  transaction: Transaction,
  phoneNumber: string
): string {
  const message = formatTransactionMessage(transaction);
  const encodedMessage = encodeURIComponent(message);

  // Remove caracteres não numéricos do número
  const cleanPhone = phoneNumber.replace(/\D/g, "");

  return `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
}

/**
 * Abre WhatsApp para compartilhar transação
 */
export function shareTransactionOnWhatsApp(transaction: Transaction): void {
  const link = generateWhatsAppShareLink(transaction);
  window.open(link, "_blank");
}

/**
 * Abre WhatsApp para compartilhar com número específico
 */
export function shareTransactionOnWhatsAppWithNumber(
  transaction: Transaction,
  phoneNumber: string
): void {
  const link = generateWhatsAppShareLinkWithNumber(transaction, phoneNumber);
  window.open(link, "_blank");
}

/**
 * Copia mensagem para clipboard
 */
export async function copyTransactionToClipboard(
  transaction: Transaction
): Promise<void> {
  const message = formatTransactionMessage(transaction);
  try {
    await navigator.clipboard.writeText(message);
  } catch (err) {
    console.error("Erro ao copiar para clipboard:", err);
    throw err;
  }
}
