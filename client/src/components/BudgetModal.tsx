import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@shared/formatters";
import { X, Plus, Trash2, Edit2, Save } from "lucide-react";

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

  const { data: existingBudgets } = trpc.budgets.list.useQuery({});

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
    // Encontrar ID da categoria pelo nome (já que o budget só tem o nome)
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        className={`rounded-lg p-6 w-full max-w-md ${theme === "dark"
          ? "bg-slate-900 border border-slate-800"
          : "bg-white border border-slate-200"
          }`}
      >
        <div className="flex justify-between items-center mb-4">
          <h2
            className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-slate-900"
              }`}
          >
            💰 Gerenciar Metas
          </h2>
          <button
            onClick={onClose}
            className={`p-1 rounded ${theme === "dark"
              ? "hover:bg-slate-800 text-slate-400"
              : "hover:bg-slate-100 text-slate-600"
              }`}
          >
            <X size={20} />
          </button>
        </div>

        {/* Existing Budgets List */}
        <div className="mb-6 max-h-64 overflow-y-auto">
          <h3
            className={`text-sm font-semibold mb-3 ${theme === "dark" ? "text-slate-300" : "text-slate-700"
              }`}
          >
            Metas Existentes
          </h3>
          {existingBudgets && existingBudgets.length > 0 ? (
            <div className="space-y-2">
              {existingBudgets.map((budget) => (
                <div
                  key={budget.id}
                  className={`flex justify-between items-center p-3 rounded ${theme === "dark"
                    ? "bg-slate-800"
                    : "bg-slate-50"
                    }`}
                >
                  <div className="flex-1">
                    <p
                      className={`text-sm ${theme === "dark"
                        ? "text-slate-400"
                        : "text-slate-600"
                        }`}
                    >
                      {budget.category}
                    </p>
                    <p
                      className={`text-sm ${theme === "dark"
                        ? "text-slate-400"
                        : "text-slate-600"
                        }`}
                    >
                      {formatCurrency(typeof budget.limit === 'string' ? parseFloat(budget.limit) : budget.limit)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(budget)}
                      className="p-2 text-blue-500 hover:bg-blue-500 hover:bg-opacity-10 rounded"
                      title="Editar Meta"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() =>
                        deleteMutation.mutate({ id: budget.id as number })
                      }
                      className="p-2 text-red-500 hover:bg-red-500 hover:bg-opacity-10 rounded"
                      disabled={deleteMutation.isPending}
                      title="Excluir Meta"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p
              className={`text-sm ${theme === "dark"
                ? "text-slate-400"
                : "text-slate-600"
                }`}
            >
              Nenhuma meta definida ainda
            </p>
          )}
        </div>

        {/* Add/Edit Budget Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className={`block text-sm font-medium mb-2 ${theme === "dark"
                ? "text-slate-300"
                : "text-slate-700"
                }`}
            >
              Categoria
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(Number(e.target.value) || "")}
              disabled={!!editingBudget} // Disable category selection during edit
              className={`w-full px-3 py-2 rounded border ${theme === "dark"
                ? "bg-slate-800 border-slate-700 text-white disabled:opacity-50"
                : "bg-white border-slate-300 text-slate-900 disabled:opacity-50"
                }`}
            >
              <option value="">Selecione uma categoria</option>
              {categories?.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              className={`block text-sm font-medium mb-2 ${theme === "dark"
                ? "text-slate-300"
                : "text-slate-700"
                }`}
            >
              Limite (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              placeholder="1000.00"
              className={`w-full px-3 py-2 rounded border ${theme === "dark"
                ? "bg-slate-800 border-slate-700 text-white"
                : "bg-white border-slate-300 text-slate-900"
                }`}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting || !selectedCategory || !limit}
              className={`flex-1 font-medium py-2 px-4 rounded flex items-center justify-center gap-2 text-white ${editingBudget
                ? "bg-green-600 hover:bg-green-700"
                : "bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600"
                }`}
            >
              {editingBudget ? <Save size={18} /> : <Plus size={18} />}
              {editingBudget ? "Salvar Alteração" : "Adicionar Meta"}
            </button>
            {editingBudget && (
              <button
                type="button"
                onClick={cancelEdit}
                className={`flex-1 px-4 py-2 rounded font-medium ${theme === "dark"
                  ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
              >
                Cancelar
              </button>
            )}
            {!editingBudget && (
              <button
                type="button"
                onClick={onClose}
                className={`flex-1 px-4 py-2 rounded font-medium ${theme === "dark"
                  ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
              >
                Fechar
              </button>
            )}

          </div>
        </form>
      </div>
    </div>
  );
}
