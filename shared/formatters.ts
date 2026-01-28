/**
 * Formatadores para padrão brasileiro
 */

/**
 * Formata um número como moeda brasileira (R$ 1.234,56)
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Formata uma data para o padrão brasileiro (DD/MM/YYYY)
 */
export function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Formata uma data com hora (DD/MM/YYYY HH:mm)
 */
export function formatDateTime(date: Date): string {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/**
 * Converte uma data no formato DD/MM/YYYY para YYYY-MM-DD
 */
export function parseBrazilianDate(dateString: string): string {
  const [day, month, year] = dateString.split("/");
  return `${year}-${month}-${day}`;
}

/**
 * Obter a data de hoje no formato YYYY-MM-DD
 */
export function getTodayString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Obter o primeiro dia do mês atual no formato YYYY-MM-DD
 */
export function getFirstDayOfMonth(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

/**
 * Obter o último dia do mês atual no formato YYYY-MM-DD
 */
export function getLastDayOfMonth(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  const monthStr = String(month).padStart(2, "0");
  const dayStr = String(lastDay).padStart(2, "0");
  return `${year}-${monthStr}-${dayStr}`;
}

/**
 * Obter o mês em formato legível (Janeiro, Fevereiro, etc)
 */
export function getMonthName(monthIndex: number): string {
  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return months[monthIndex] || "";
}

/**
 * Formata um número com separadores brasileiros (1.234,56)
 */
export function formatNumber(value: number, decimals: number = 2): string {
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
