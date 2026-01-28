import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@shared/formatters";
import { X, Plus, Trash2, Edit2, Save } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";

interface BudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: "light" | "dark";
  categories: { id: number; name: string }[];
  onBudgetUpdated: () => void;
}

export function BudgetModal({
  isOpen,
  onClose,
  theme,
  categories,
  onBudgetUpdated,
}: BudgetModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<number | "">("");
  const [limit, setLimit] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBudget, setEditingBudget] = useState<{ id: number } | null>(null);

  // Use 'progress' endpoint to get spent amount
  const { data: existingBudgets } = trpc.budgets.progress.useQuery({});

  const createMutation = trpc.budgets.create.useMutation({
    onSuccess: () => {
      resetForm();
      onBudgetUpdated();
    },
  });

  const updateMutation = trpc.budgets.update.useMutation({
    onSuccess: () => {
      resetForm();
      onBudgetUpdated();
    },
  });

  const deleteMutation = trpc.budgets.delete.useMutation({
    onSuccess: () => {
      onBudgetUpdated();
    },
  });

  const resetForm = () => {
    setSelectedCategory("");
    setLimit("");
    setEditingBudget(null);
  };

  const handleEdit = (budget: any) => {
    setEditingBudget({ id: budget.id });
    setLimit(parseFloat(budget.limit).toString());
    const category = categories.find(c => c.name === budget.category);
    if (category) {
      setSelectedCategory(category.id);
    }
  };

  const cancelEdit = () => {
    resetForm();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory || !limit) return;

    setIsSubmitting(true);
    try {
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

      if (editingBudget) {
        await updateMutation.mutateAsync({
          id: editingBudget.id,
          limit: parseFloat(limit),
        });
      } else {
        await createMutation.mutateAsync({
          category: categories?.find((c) => c.id === Number(selectedCategory))?.name || "",
          limit: parseFloat(limit),
          month: currentMonth,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Helper to get progress bar color based on percentage
  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return "bg-red-500";
    if (percentage >= 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Modal Content */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: "spring", duration: 0.3 }}
            className={`relative z-10 w-full max-w-md p-6 rounded-xl shadow-2xl ${theme === "dark"
                ? "bg-slate-900 border border-slate-800"
                : "bg-white border border-slate-200"
              }`}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                💰 Gerenciar Metas
              </h2>
              <button
                onClick={onClose}
                className={`p-2 rounded-full transition-colors ${theme === "dark"
                    ? "hover:bg-slate-800 text-slate-400 hover:text-white"
                    : "hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                  }`}
              >
                <X size={20} />
              </button>
            </div>

            {/* Existing Budgets List */}
            <div className="mb-6 max-h-[300px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
              <h3 className={`text-xs font-bold uppercase tracking-wider mb-3 ${theme === "dark" ? "text-slate-500" : "text-slate-500"}`}>
                Metas Ativas
              </h3>

              {existingBudgets && existingBudgets.length > 0 ? (
                existingBudgets.map((budget: any) => {
                  const percentage = Math.min(100, (budget.spent / budget.limit) * 100);
                  const isExceeded = budget.spent > budget.limit;

                  return (
                    <div
                      key={budget.id}
                      className={`p-4 rounded-lg border transition-all ${theme === "dark"
                          ? "bg-slate-800/50 border-slate-700 hover:bg-slate-800"
                          : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                        }`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className={`font-medium ${theme === "dark" ? "text-slate-200" : "text-slate-800"}`}>
                            {budget.category}
                          </p>
                          <p className={`text-xs mt-1 ${theme === "dark" ? "text-slate-400" : "text-slate-500"}`}>
                            <span className={isExceeded ? "text-red-400 font-bold" : ""}>
                              {formatCurrency(budget.spent)}
                            </span>
                            {" de "}
                            <span className="font-medium">{formatCurrency(budget.limit)}</span>
                          </p>
                        </div>

                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEdit(budget)}
                            className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-md transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate({ id: budget.id })}
                            className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-md transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="relative pt-1">
                        <div className="flex justify-between text-[10px] mb-1 font-medium">
                          <span className={theme === "dark" ? "text-slate-400" : "text-slate-500"}>
                            {percentage.toFixed(0)}%
                          </span>
                          <span className={isExceeded ? "text-red-500" : "text-green-500"}>
                            {isExceeded ? "Estourado!" : "Dentro da meta"}
                          </span>
                        </div>
                        <Progress
                          value={percentage}
                          className={`h-2 ${theme === "dark" ? "bg-slate-700" : "bg-slate-200"}`}
                        // @ts-ignore - hacking the indicator color via style injection or custom prop if needed, 
                        // but standard Progress component might need modification to accept color.
                        // easier way: wrap indicator styling or pass class to Progress 
                        // but the standard shadcn Progress uses a fixed inner class.
                        // We will rely on our own wrapper or simple divorce from shadcn for this specific color logic
                        // actually, let's just use a simple div for full control over color
                        />
                        {/* Custom Progress Bar since Shadcn's is hard to colorize dynamically without modifying the component */}
                        <div className={`h-2 w-full rounded-full mt-1 overflow-hidden ${theme === "dark" ? "bg-slate-700" : "bg-slate-200"}`}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                            className={`h-full rounded-full ${getProgressColor(percentage)}`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className={`text-center py-8 border-2 border-dashed rounded-lg ${theme === "dark" ? "border-slate-800 text-slate-500" : "border-slate-200 text-slate-400"
                  }`}>
                  <p>Nenhuma meta definida</p>
                </div>
              )}
            </div>

            {/* Add/Edit Form */}
            <form onSubmit={handleSubmit} className={`border-t pt-4 ${theme === "dark" ? "border-slate-800" : "border-slate-100"}`}>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                    Categoria
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(Number(e.target.value) || "")}
                    disabled={!!editingBudget}
                    className={`w-full px-3 py-2 rounded-lg text-sm border focus:ring-2 focus:ring-primary/50 outline-none transition-all ${theme === "dark"
                        ? "bg-slate-800 border-slate-700 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-900"
                      }`}
                  >
                    <option value="">Selecione...</option>
                    {categories?.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-xs font-semibold mb-1.5 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                    Limite (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={limit}
                    onChange={(e) => setLimit(e.target.value)}
                    placeholder="0.00"
                    className={`w-full px-3 py-2 rounded-lg text-sm border focus:ring-2 focus:ring-primary/50 outline-none transition-all ${theme === "dark"
                        ? "bg-slate-800 border-slate-700 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-900"
                      }`}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedCategory || !limit}
                  className={`flex-1 py-2.5 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 text-white transition-all shadow-lg active:scale-95 ${editingBudget
                      ? "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20"
                      : "bg-blue-600 hover:bg-blue-500 shadow-blue-500/20 disabled:bg-slate-600 disabled:shadow-none"
                    }`}
                >
                  {editingBudget ? <Save size={16} /> : <Plus size={16} />}
                  {editingBudget ? "Salvar" : "Adicionar Meta"}
                </button>

                {editingBudget && (
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-colors ${theme === "dark"
                        ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
