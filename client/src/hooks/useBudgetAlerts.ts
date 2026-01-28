import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export function useBudgetAlerts() {
  const { data: budgetProgress } = trpc.budgets.progress.useQuery({});
  const alertedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!budgetProgress) return;

    budgetProgress.forEach((budget) => {
      const percentage = budget.percentage;
      const alertKey = `${budget.category}-${Math.floor(percentage / 10) * 10}`;

      // Alert at 80%
      if (percentage >= 80 && percentage < 100 && !alertedRef.current.has(`${budget.category}-80`)) {
        toast.warning(`⚠️ Atenção: ${budget.category} já atingiu 80% do orçamento (${percentage.toFixed(0)}%)`, {
          description: `Você gastou R$ ${budget.spent.toFixed(2)} de R$ ${budget.limit.toFixed(2)}`,
          duration: 5000,
        });
        alertedRef.current.add(`${budget.category}-80`);
      }

      // Alert at 100%+
      if (percentage >= 100 && !alertedRef.current.has(`${budget.category}-100`)) {
        toast.error(`🚨 Limite ultrapassado: ${budget.category} (${percentage.toFixed(0)}%)`, {
          description: `Você gastou R$ ${budget.spent.toFixed(2)}, orçamento é R$ ${budget.limit.toFixed(2)}`,
          duration: 5000,
        });
        alertedRef.current.add(`${budget.category}-100`);
      }
    });
  }, [budgetProgress]);
}
