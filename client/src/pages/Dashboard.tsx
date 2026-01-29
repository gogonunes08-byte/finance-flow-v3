import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate, getTodayString, getFirstDayOfMonth, getLastDayOfMonth } from "@shared/formatters";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { BudgetModal } from "@/components/BudgetModal";
import { shareTransactionOnWhatsApp } from "@/lib/whatsappShare";
import { Loader2, Plus, Edit2, Trash2, Eye, Download, Moon, Sun, TrendingUp, TrendingDown, DollarSign, CreditCard, Wallet, BarChart3, Menu, X, Share2 } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useBudgetAlerts } from "@/hooks/useBudgetAlerts";
import { exportDashboardToPDF } from "@/lib/pdfExport";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { FinancialCopilot } from "@/components/FinancialCopilot";

const COLORS = ["#6366f1", "#ec4899", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ef4444", "#14b8a6"];

const CATEGORY_ICONS: Record<string, string> = {
  "Alimentação": "🍔",
  "Transporte": "🚗",
  "Saúde": "🏥",
  "Educação": "📚",
  "Lazer": "🎮",
  "Compras": "🛍️",
  "Utilidades": "🏠",
  "Trabalho": "💼",
  "Investimento": "📈",
  "Outros": "📌",
};

export default function Dashboard() {
  const { theme, toggleTheme } = useTheme();
  useBudgetAlerts(); // Monitorar alertas de orçamento
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth >= 768);
  const [dateRange, setDateRange] = useState<"today" | "month" | "all">("month");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTransactionData, setNewTransactionData] = useState({
    type: "expense" as "income" | "expense",
    amount: "",
    category: "",
    description: "",
    date: new Date().toISOString().split('T')[0],
    paymentMethod: "Outro",
    isRecurring: false,
  });
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [editingTransaction, setEditingTransaction] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState<any>(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [viewingTransaction, setViewingTransaction] = useState<any>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showTransactionsTable, setShowTransactionsTable] = useState(true);
  const [hideBalance, setHideBalance] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('hideBalance');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  // Salvar hideBalance no localStorage quando mudar
  useEffect(() => {
    localStorage.setItem('hideBalance', JSON.stringify(hideBalance));
  }, [hideBalance]);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [globalLimit, setGlobalLimit] = useState(5000);

  const getDateRange = () => {
    const today = getTodayString();
    switch (dateRange) {
      case "today":
        return { startDate: today, endDate: today };
      case "month":
        return { startDate: getFirstDayOfMonth(), endDate: getLastDayOfMonth() };
      default:
        return { startDate: undefined, endDate: undefined };
    }
  };

  const dates = getDateRange();

  const { data: stats, isLoading: statsLoading } = trpc.transactions.stats.useQuery({});
  const { data: filteredStats, isLoading: filteredStatsLoading } = trpc.transactions.stats.useQuery(dates);
  const { data: byCategory, isLoading: categoryLoading } = trpc.transactions.byCategory.useQuery(dates);
  const { data: transactions, isLoading: transactionsLoading, refetch: refetchTransactions } = trpc.transactions.list.useQuery(dates);

  // Filter transactions client-side
  const filteredTransactionsList = transactions?.filter(t => {
    const typeMatch = filterType === "all" || t.type === filterType;
    const categoryMatch = filterCategory === "all" || t.category === filterCategory;
    return typeMatch && categoryMatch;
  }).slice(page * 20, (page + 1) * 20) || [];
  const { data: categories, refetch: refetchCategories } = trpc.categories.list.useQuery();
  const { data: settingsData } = trpc.settings.getLimit.useQuery();
  const updateLimitMutation = trpc.settings.updateLimit.useMutation();
  const createCategoryMutation = trpc.categories.create.useMutation({
    onSuccess: (data: any, variables: any) => {
      setIsCreatingCategory(false);
      setNewCategoryName("");
      if (showAddModal) {
        setNewTransactionData(prev => ({ ...prev, category: variables.name }));
      } else if (showEditModal && editFormData) {
        setEditFormData((prev: any) => ({ ...prev, category: variables.name }));
      }
      refetchCategories(); // Atualizar lista de categorias
    }
  });

  const PAYMENT_METHODS = ["Pix", "Crédito", "Débito", "Dinheiro", "Outro"];

  const createTransactionMutation = trpc.transactions.create.useMutation({
    onSuccess: () => {
      refetchTransactions();
      setShowAddModal(false);
      setNewTransactionData({
        type: "expense",
        amount: "",
        category: "",
        description: "",
        date: new Date().toISOString().split('T')[0],
        paymentMethod: "Outro",
        isRecurring: false,
      });
    },
  });

  // Atualizar globalLimit quando os dados forem carregados
  useEffect(() => {
    if (settingsData?.globalSpendingLimit) {
      setGlobalLimit(settingsData.globalSpendingLimit);
    }
  }, [settingsData]);



  const getCurrentMonth = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const { data: budgetProgress, isLoading: budgetsLoading, refetch: refetchBudgets } = trpc.budgets.progress.useQuery(
    { month: dateRange === "month" ? getCurrentMonth() : undefined },
    { enabled: true }
  );
  const deleteMutation = trpc.transactions.delete.useMutation({
    onSuccess: () => refetchTransactions(),
  });

  const updateMutation = trpc.transactions.update.useMutation({
    onSuccess: () => {
      refetchTransactions();
      setShowEditModal(false);
      setEditingTransaction(null);
      setEditFormData(null);
    },
  });

  const handleEditClick = (transaction: any) => {
    setEditingTransaction(transaction);
    setEditFormData({
      amount: Number(transaction.amount),
      description: transaction.description,
      category: transaction.category,
      paymentMethod: transaction.paymentMethod,
      date: transaction.date,
      type: transaction.type,
      isRecurring: transaction.isRecurring ?? false,
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editingTransaction || !editFormData) return;
    updateMutation.mutate({
      id: editingTransaction.id,
      ...editFormData,
      amount: Number(editFormData.amount),
    });
  };

  const handleDelete = (id: number) => {
    if (confirm("Tem certeza que deseja deletar esta transação?")) {
      deleteMutation.mutate({ id });
    }
  };

  // Calcular progresso de gastos
  const spendingProgress = useMemo(() => {
    if (!filteredStats) return 0;
    const monthlyBudget = 5000; // Budget mensal padrão
    const percentage = Math.min((filteredStats.totalExpense / monthlyBudget) * 100, 100);
    return percentage;
  }, [filteredStats]);

  // Calcular tendência
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const isLoading = statsLoading || filteredStatsLoading || transactionsLoading;

  return (
    <div className={`min-h-screen transition-colors duration-300 ${theme === "dark" ? "bg-slate-950" : "bg-slate-50"}`}>
      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-screen w-64 md:w-64 transition-all duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } ${theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"} border-r z-40`}>
        <div className="p-6 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Finance Flow</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className={`p-2 rounded-lg transition-colors ${theme === "dark" ? "bg-slate-800 hover:bg-slate-700" : "bg-slate-100 hover:bg-slate-200"}`}
            title="Recolher menu"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="px-4 space-y-2">
          <div className={`p-3 rounded-lg ${theme === "dark" ? "bg-slate-800" : "bg-slate-100"}`}>
            <p className={`text-xs font-semibold ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>MENU</p>
          </div>
          <button className={`w-full text-left px-4 py-2 rounded-lg font-medium transition-colors ${theme === "dark" ? "bg-blue-600 text-white" : "bg-blue-50 text-blue-600"
            }`}>
            📊 Dashboard
          </button>
          <a
            href="/investments"
            className={`block w-full text-left px-4 py-2 rounded-lg transition-colors ${theme === "dark" ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"
              }`}
          >
            💰 Investimentos
          </a>
          <a
            href="/reports"
            className={`block w-full text-left px-4 py-2 rounded-lg transition-colors ${theme === "dark" ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"
              }`}
          >
            📈 Relatórios
          </a>
          <a
            href="/settings"
            className={`block w-full text-left px-4 py-2 rounded-lg transition-colors ${theme === "dark" ? "text-slate-300 hover:bg-slate-800" : "text-slate-600 hover:bg-slate-100"
              }`}
          >
            ⚙️ Configurações
          </a>
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <div className={`p-4 rounded-lg ${theme === "dark" ? "bg-gradient-to-br from-blue-900 to-purple-900" : "bg-gradient-to-br from-blue-50 to-purple-50"}`}>
            <p className={`text-sm font-semibold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>Saldo Total</p>
            <p className="text-2xl font-bold text-blue-600 mt-2">{hideBalance ? "••••••" : formatCurrency(stats?.balance || 0)}</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`transition-all duration-300 ${sidebarOpen ? "ml-0 md:ml-64" : "ml-0"}`}>
        {/* Header */}
        <header className={`sticky top-0 z-30 border-b transition-colors duration-300 ${theme === "dark" ? "border-slate-800 bg-slate-900/80" : "border-slate-200 bg-white/80"
          } backdrop-blur-sm`}>
          <div className="px-3 md:px-6 py-3 md:py-4 flex justify-between items-center">
            <div className="flex items-center gap-4">
              {!sidebarOpen && (
                <button
                  onClick={() => setSidebarOpen(true)}
                  className={`px-4 py-2 rounded-lg transition-all duration-300 font-semibold flex items-center gap-2 ${theme === "dark" ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-blue-500 hover:bg-blue-600 text-white"}`}
                  title="Abrir menu"
                >
                  <Menu size={20} /> Menu
                </button>
              )}
              <div className="hidden sm:block">
                <h1 className="text-xl md:text-2xl font-bold">Finance Flow Pro</h1>
                <p className={`text-xs md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Seu sistema de controle financeiro pessoal</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowAddModal(true)}
                className={`p-2 rounded-lg transition-colors duration-300 font-medium flex items-center gap-2 ${theme === "dark"
                  ? "bg-slate-800 hover:bg-slate-700 text-blue-400"
                  : "bg-slate-100 hover:bg-slate-200 text-blue-600"
                  }`}
                title="Adicionar transação rápida"
              >
                <Plus size={20} /> <span className="hidden sm:inline">Rápido</span>
              </button>
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg transition-colors duration-300 ${theme === "dark"
                  ? "bg-slate-800 text-yellow-400 hover:bg-slate-700"
                  : "bg-slate-200 text-slate-800 hover:bg-slate-300"
                  }`}
                title={theme === "dark" ? "Modo claro" : "Modo escuro"}
              >
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            </div>
          </div>
        </header>
        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <div className="p-3 md:p-6 space-y-4 md:space-y-6">
            {/* Progress Bar */}
            <div className={`p-6 rounded-xl ${theme === "dark" ? "bg-slate-900 border border-slate-800" : "bg-white border border-slate-200"}`}>
              <div className="flex justify-between items-center mb-4">
                <div>
                  <p className={`text-sm font-semibold ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Progresso de Gastos</p>
                  <p className="text-2xl font-bold mt-1">{formatCurrency(filteredStats?.totalExpense || 0)} / {formatCurrency(globalLimit)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowLimitModal(true)}
                    className="px-3 py-1 rounded text-sm bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
                    title="Configurar limites"
                  >
                    ⚙️
                  </button>
                  <div className="text-right">
                    <p className={`text-3xl font-bold ${spendingProgress > 80 ? "text-red-600" : spendingProgress > 50 ? "text-yellow-600" : "text-green-600"}`}>
                      {spendingProgress.toFixed(0)}%
                    </p>
                  </div>
                </div>
              </div >
              <div className={`w-full h-3 rounded-full overflow-hidden ${theme === "dark" ? "bg-slate-800" : "bg-slate-200"}`}>
                <div
                  className={`h-full transition-all duration-500 ${spendingProgress > 80 ? "bg-gradient-to-r from-red-500 to-red-600" : spendingProgress > 50 ? "bg-gradient-to-r from-yellow-500 to-yellow-600" : "bg-gradient-to-r from-green-500 to-green-600"
                    }`}
                  style={{ width: `${spendingProgress}%` }}
                />
              </div>
            </div >

            {/* Cards de Resumo */}
            < div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4" >
              {/* Card Entradas */}
              < div className={`p-3 md:p-6 rounded-lg md:rounded-xl transition-all duration-300 ${theme === "dark" ? "bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 hover:border-green-600" : "bg-gradient-to-br from-white to-slate-50 border border-slate-200 hover:border-green-600"
                } hover:shadow-lg`
              }>
                <div className="flex justify-between items-start mb-3 md:mb-4">
                  <div>
                    <p className={`text-xs md:text-sm font-semibold ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Entradas</p>
                    <p className="text-xl md:text-3xl font-bold text-green-600 mt-1 md:mt-2">{formatCurrency(filteredStats?.totalIncome || 0)}</p>
                  </div>
                  <div className="p-2 md:p-3 rounded-lg bg-green-600/20">
                    <DollarSign className="text-green-600" size={18} />
                  </div>
                </div>
                {
                  filteredStats && (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="text-green-600" size={16} />
                      <span className="text-green-600 font-semibold">+5.2%</span>
                    </div>
                  )
                }
              </div >

              {/* Card Saídas */}
              < div className={`p-3 md:p-6 rounded-lg md:rounded-xl transition-all duration-300 ${theme === "dark" ? "bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 hover:border-red-600" : "bg-gradient-to-br from-white to-slate-50 border border-slate-200 hover:border-red-600"
                } hover:shadow-lg`}>
                <div className="flex justify-between items-start mb-3 md:mb-4">
                  <div>
                    <p className={`text-xs md:text-sm font-semibold ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Saídas</p>
                    <p className="text-xl md:text-3xl font-bold text-red-600 mt-1 md:mt-2">{formatCurrency(filteredStats?.totalExpense || 0)}</p>
                  </div>
                  <div className="p-2 md:p-3 rounded-lg bg-red-600/20">
                    <CreditCard className="text-red-600" size={18} />
                  </div>
                </div>
                {
                  filteredStats && (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingDown className="text-red-600" size={16} />
                      <span className="text-red-600 font-semibold">-2.1%</span>
                    </div>
                  )
                }
              </div >

              {/* Card Saldo */}
              < div className={`p-3 md:p-6 rounded-lg md:rounded-xl transition-all duration-300 ${theme === "dark" ? "bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 hover:border-blue-600" : "bg-gradient-to-br from-white to-slate-50 border border-slate-200 hover:border-blue-600"
                } hover:shadow-lg`}>
                <div className="flex justify-between items-start mb-3 md:mb-4">
                  <div>
                    <p className={`text-xs md:text-sm font-semibold ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Saldo</p>
                    <p className={`text-xl md:text-3xl font-bold mt-1 md:mt-2 ${(stats?.balance || 0) >= 0 ? "text-blue-600" : "text-red-600"}`}>
                      {hideBalance ? "••••••" : formatCurrency(stats?.balance || 0)}
                    </p>
                  </div>
                  <div className="flex gap-1 md:gap-2 items-start">
                    <button
                      onClick={() => setHideBalance(!hideBalance)}
                      className="px-1 md:px-2 py-1 rounded text-xs md:text-sm hover:bg-blue-600/20 transition-colors"
                      title={hideBalance ? "Mostrar saldo" : "Esconder saldo"}
                    >
                      {hideBalance ? "👁️" : "🙈"}
                    </button>
                    <div className="p-2 md:p-3 rounded-lg bg-blue-600/20">
                      <Wallet className="text-blue-600" size={18} />
                    </div>
                  </div>
                </div>
                <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Saldo acumulado</p>
              </div >

              {/* Card Total */}
              < div className={`p-3 md:p-6 rounded-lg md:rounded-xl transition-all duration-300 ${theme === "dark" ? "bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 hover:border-purple-600" : "bg-gradient-to-br from-white to-slate-50 border border-slate-200 hover:border-purple-600"
                } hover:shadow-lg`}>
                <div className="flex justify-between items-start mb-3 md:mb-4">
                  <div>
                    <p className={`text-xs md:text-sm font-semibold ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Total</p>
                    <p className="text-xl md:text-3xl font-bold text-purple-600 mt-1 md:mt-2">{filteredStats?.count || 0}</p>
                  </div>
                  <div className="p-2 md:p-3 rounded-lg bg-purple-600/20">
                    <BarChart3 className="text-purple-600" size={18} />
                  </div>
                </div>
                <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Transações</p>
              </div >
            </div >

            {/* Charts */}
            < div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6" >
              {/* Pie Chart */}
              < div className={`p-3 md:p-6 rounded-lg md:rounded-xl ${theme === "dark" ? "bg-slate-900 border border-slate-800" : "bg-white border border-slate-200"}`}>
                <h3 className={`text-base md:text-lg font-bold mb-3 md:mb-6 ${theme === "dark" ? "text-white" : "text-slate-900"}`}>Distribuição por Categoria</h3>
                {
                  categoryLoading ? (
                    <div className="flex justify-center items-center h-48 md:h-64">
                      <Loader2 className="animate-spin" size={32} />
                    </div>
                  ) : byCategory && byCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie data={byCategory.map(item => ({ name: item.category, value: item.total }))} cx="50%" cy="50%" labelLine={false} label={({ name, value }) => `${name}: R$ ${value.toFixed(2)}`} outerRadius={100} fill="#8884d8" dataKey="value">
                          {byCategory.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className={`text-center py-12 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Sem dados para exibir</p>
                  )
                }
              </div >

              {/* Bar Chart */}
              < div className={`p-3 md:p-6 rounded-lg md:rounded-xl ${theme === "dark" ? "bg-slate-900 border border-slate-800" : "bg-white border border-slate-200"}`}>
                <h3 className={`text-base md:text-lg font-bold mb-3 md:mb-6 ${theme === "dark" ? "text-white" : "text-slate-900"}`}>Entradas vs Saídas (Mensal)</h3>
                {
                  filteredStatsLoading ? (
                    <div className="flex justify-center items-center h-48 md:h-64">
                      <Loader2 className="animate-spin" size={32} />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={[{ month: "01/2026", Entradas: filteredStats?.totalIncome || 0, Saídas: filteredStats?.totalExpense || 0 }]}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#334155" : "#e2e8f0"} />
                        <XAxis dataKey="month" stroke={theme === "dark" ? "#94a3b8" : "#64748b"} />
                        <YAxis stroke={theme === "dark" ? "#94a3b8" : "#64748b"} />
                        <Tooltip formatter={(value: any) => formatCurrency(Number(value))} contentStyle={{
                          backgroundColor: theme === "dark" ? "#1e293b" : "#ffffff",
                          border: `1px solid ${theme === "dark" ? "#334155" : "#e2e8f0"}`,
                          color: theme === "dark" ? "#f1f5f9" : "#1e293b",
                        }} />
                        <Legend />
                        <Bar dataKey="Entradas" fill="#10b981" radius={[8, 8, 0, 0]} />
                        <Bar dataKey="Saídas" fill="#ef4444" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )
                }
              </div >
            </div >

            {/* Budget Progress Section */}
            < div className={`p-6 rounded-xl ${theme === "dark" ? "bg-slate-900 border border-slate-800" : "bg-white border border-slate-200"}`}>
              <div className="flex justify-between items-center mb-4">
                <h3 className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>📊 Progresso de Metas</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowBudgetModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium text-sm"
                  >
                    ⚙️ Gerenciar Metas
                  </button>
                  <button
                    onClick={exportDashboardToPDF}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition flex items-center gap-2"
                  >
                    <Download size={18} />
                    Exportar PDF
                  </button>
                </div>
              </div>
              {
                budgetsLoading ? (
                  <div className="flex justify-center items-center h-32">
                    <Loader2 className="animate-spin" size={32} />
                  </div>
                ) : budgetProgress && budgetProgress.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {budgetProgress.map((budget) => {
                      const getColor = (percentage: number) => {
                        if (percentage >= 100) return "red";
                        if (percentage >= 80) return "yellow";
                        return "green";
                      };

                      const colorMap = {
                        red: { bar: "bg-red-500", text: "text-red-600" },
                        yellow: { bar: "bg-yellow-500", text: "text-yellow-600" },
                        green: { bar: "bg-green-500", text: "text-green-600" },
                      };

                      const color = getColor(budget.percentage);
                      const colorClass = colorMap[color as keyof typeof colorMap];

                      return (
                        <div key={budget.id} className={`p-4 rounded-lg ${theme === "dark" ? "bg-slate-800" : "bg-slate-50"}`}>
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold">{budget.category}</span>
                            <span className={`text-sm font-bold ${colorClass.text}`}>{Math.round(budget.percentage)}%</span>
                          </div>
                          <div className="w-full bg-slate-300 rounded-full h-2 mb-2">
                            <div className={`${colorClass.bar} h-2 rounded-full`} style={{ width: `${Math.min(100, budget.percentage)}%` }}></div>
                          </div>
                          <p className="text-xs text-slate-500">Gasto: {formatCurrency(parseFloat(budget.spent.toString()))} | Meta: {formatCurrency(budget.limit)}</p>
                          {budget.isExceeded && <p className="text-xs text-red-600 mt-1">⚠️ Limite ultrapassado!</p>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className={`text-center py-8 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Nenhuma meta definida. Crie uma para começar!</p>
                )
              }
            </div >
            {/* Transactions Table */}
            < div className={`p-6 rounded-xl ${theme === "dark" ? "bg-slate-900 border border-slate-800" : "bg-white border border-slate-200"}`}>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <h3 className={`text-lg font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>Transações</h3>
                  <button
                    onClick={() => setShowTransactionsTable(!showTransactionsTable)}
                    className="px-2 py-1 rounded text-sm hover:bg-slate-600/20 transition-colors"
                    title={showTransactionsTable ? "Recolher" : "Expandir"}
                  >
                    {showTransactionsTable ? "⬆️" : "⬇️"}
                  </button>
                </div>
                <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                      <Plus size={18} className="mr-2" /> Nova Transação
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Nova Transação</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      {/* Tipo */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>Tipo de Transação</label>
                        <Select
                          value={newTransactionData.type}
                          onValueChange={(value: "income" | "expense") => setNewTransactionData({ ...newTransactionData, type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="expense">💸 Saída</SelectItem>
                            <SelectItem value="income">💰 Entrada</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Valor */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>Valor (R$)</label>
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={newTransactionData.amount}
                          onChange={(e) => setNewTransactionData({ ...newTransactionData, amount: e.target.value })}
                        />
                      </div>

                      {/* Categoria */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>Categoria</label>
                        <div className="flex gap-2">
                          {!isCreatingCategory ? (
                            <>
                              <Select
                                value={newTransactionData.category}
                                onValueChange={(value) => setNewTransactionData({ ...newTransactionData, category: value })}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Selecione uma categoria" />
                                </SelectTrigger>
                                <SelectContent>
                                  {categories?.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.name}>
                                      {CATEGORY_ICONS[cat.name] || "📌"} {cat.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                variant="outline"
                                className="px-3"
                                title="Criar nova categoria"
                                onClick={() => setIsCreatingCategory(true)}
                              >
                                <Plus size={16} />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Input
                                placeholder="Nome da nova categoria"
                                value={newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                className="flex-1"
                              />
                              <Button
                                className="bg-green-600 hover:bg-green-700 text-white px-3"
                                onClick={() => {
                                  if (!newCategoryName.trim()) return;
                                  createCategoryMutation.mutate({ name: newCategoryName, color: "#9ca3af" });
                                }}
                                disabled={createCategoryMutation.isPending}
                              >
                                {createCategoryMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : "Ok"}
                              </Button>
                              <Button
                                variant="outline"
                                className="px-3"
                                onClick={() => {
                                  setIsCreatingCategory(false);
                                  setNewCategoryName("");
                                }}
                              >
                                <X size={16} />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Descrição */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>Descrição</label>
                        <Input
                          type="text"
                          placeholder="Ex: Compras no mercado"
                          value={newTransactionData.description}
                          onChange={(e) => setNewTransactionData({ ...newTransactionData, description: e.target.value })}
                        />
                      </div>

                      {/* Data */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>Data</label>
                        <Input
                          type="date"
                          value={newTransactionData.date}
                          onChange={(e) => setNewTransactionData({ ...newTransactionData, date: e.target.value })}
                        />
                      </div>

                      {/* Método de Pagamento */}
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>Método de Pagamento</label>
                        <Select
                          value={newTransactionData.paymentMethod}
                          onValueChange={(value) => setNewTransactionData({ ...newTransactionData, paymentMethod: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PAYMENT_METHODS.map((method) => (
                              <SelectItem key={method} value={method}>{method}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Recorrência */}
                      <div className="flex items-center gap-2 mt-4 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                        <input
                          type="checkbox"
                          id="new-recurring"
                          checked={newTransactionData.isRecurring || false}
                          onChange={(e) => setNewTransactionData({ ...newTransactionData, isRecurring: e.target.checked })}
                          className={`w-4 h-4 rounded ${theme === "dark" ? "bg-slate-700 border-slate-600" : "bg-white border-slate-300"}`}
                        />
                        <label htmlFor="new-recurring" className={`text-sm font-medium cursor-pointer ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                          Transação Recorrente (Cobrar todo mês)
                        </label>
                      </div>

                      {/* Botões */}
                      <div className="flex gap-3 pt-4">
                        <Button
                          variant="outline"
                          onClick={() => setShowAddModal(false)}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={() => {
                            if (!newTransactionData.amount || !newTransactionData.category) {
                              toast.error("Preencha valor e categoria!");
                              return;
                            }
                            createTransactionMutation.mutate({
                              type: newTransactionData.type,
                              amount: parseFloat(newTransactionData.amount),
                              category: newTransactionData.category,
                              description: newTransactionData.description || undefined,
                              date: newTransactionData.date,
                              paymentMethod: newTransactionData.paymentMethod,
                            });
                          }}
                          disabled={createTransactionMutation.isPending}
                          className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                        >
                          {createTransactionMutation.isPending ? (
                            <><Loader2 className="animate-spin mr-2" size={16} /> Salvando...</>
                          ) : (
                            "Salvar"
                          )}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {
                showTransactionsTable && (
                  <>
                    {/* Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4 mb-4 md:mb-6">
                      <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="today">Hoje</SelectItem>
                          <SelectItem value="month">Este Mês</SelectItem>
                          <SelectItem value="all">Todos</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="income">Entradas</SelectItem>
                          <SelectItem value="expense">Saídas</SelectItem>
                        </SelectContent>
                      </Select>

                      <Select value={filterCategory} onValueChange={setFilterCategory}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas as Categorias</SelectItem>
                          {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.name}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Button variant="outline" className="w-full">
                        <Download size={18} className="mr-2" /> Exportar CSV
                      </Button>
                    </div>
                    {/* Table */}
                    {
                      transactionsLoading ? (
                        <div className="flex justify-center items-center py-8 md:py-12">
                          <Loader2 className="animate-spin" size={32} />
                        </div>
                      ) : filteredTransactionsList && filteredTransactionsList.length > 0 ? (
                        <div className="overflow-x-auto -mx-3 md:mx-0">
                          <table className="w-full text-sm md:text-base">
                            <thead>
                              <tr className={`border-b ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}>
                                <th className={`text-left px-2 md:px-4 py-2 md:py-3 font-semibold text-xs md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Data</th>
                                <th className={`text-left px-2 md:px-4 py-2 md:py-3 font-semibold text-xs md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Tipo</th>
                                <th className={`text-left px-2 md:px-4 py-2 md:py-3 font-semibold text-xs md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Valor</th>
                                <th className={`hidden sm:table-cell text-left px-2 md:px-4 py-2 md:py-3 font-semibold text-xs md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Categoria</th>
                                <th className={`hidden md:table-cell text-left px-2 md:px-4 py-2 md:py-3 font-semibold text-xs md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Descrição</th>
                                <th className={`hidden lg:table-cell text-left px-2 md:px-4 py-2 md:py-3 font-semibold text-xs md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Método</th>
                                <th className={`text-left px-2 md:px-4 py-2 md:py-3 font-semibold text-xs md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Ações</th>
                              </tr>
                            </thead>
                            <tbody>
                              {filteredTransactionsList.map((transaction) => (
                                <tr
                                  key={transaction.id}
                                  className={`border-b transition-colors ${theme === "dark" ? "border-slate-800 hover:bg-slate-800/50" : "border-slate-200 hover:bg-slate-50"
                                    }`}
                                >
                                  <td className="px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm">{formatDate(transaction.date)}</td>
                                  <td className="px-2 md:px-4 py-2 md:py-3">
                                    <span className={`inline-block px-2 md:px-3 py-1 rounded-full text-xs md:text-sm font-semibold ${transaction.type === "income" ? "bg-green-600/20 text-green-600" : "bg-red-600/20 text-red-600"
                                      }`}>
                                      {transaction.type === "income" ? "Entrada" : "Saída"}
                                    </span>
                                  </td>
                                  <td className={`px-2 md:px-4 py-2 md:py-3 font-semibold text-xs md:text-sm ${transaction.type === "income" ? "text-green-600" : "text-red-600"}`}>
                                    {transaction.type === "income" ? "+" : "-"}{formatCurrency(parseFloat(transaction.amount.toString()))}
                                  </td>
                                  <td className={`hidden sm:table-cell px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm`}>
                                    <span className="flex items-center gap-1 md:gap-2">
                                      {CATEGORY_ICONS[transaction.category] || "📌"} <span className="hidden md:inline">{transaction.category}</span>
                                    </span>
                                  </td>
                                  <td className={`hidden md:table-cell px-2 md:px-4 py-2 md:py-3 max-w-xs truncate text-xs md:text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                                    {transaction.description}
                                  </td>
                                  <td className={`hidden lg:table-cell px-2 md:px-4 py-2 md:py-3 text-xs md:text-sm`}>{transaction.paymentMethod}</td>
                                  <td className="px-2 md:px-4 py-2 md:py-3">
                                    <div className="flex gap-1 md:gap-2">
                                      <button
                                        onClick={() => {
                                          setViewingTransaction(transaction);
                                          setShowViewModal(true);
                                        }}
                                        className={`p-1 md:p-2 rounded-lg transition-colors ${theme === "dark" ? "hover:bg-blue-600/20 text-blue-400" : "hover:bg-blue-50 text-blue-600"
                                          }`}
                                        title="Visualizar detalhes"
                                      >
                                        <Eye size={14} className="md:w-4 md:h-4" />
                                      </button>
                                      <button
                                        onClick={() => shareTransactionOnWhatsApp({
                                          id: transaction.id,
                                          type: transaction.type as "income" | "expense",
                                          amount: parseFloat(transaction.amount.toString()),
                                          category: transaction.category,
                                          description: transaction.description || "",
                                          paymentMethod: transaction.paymentMethod || "",
                                          date: transaction.date,
                                        })}
                                        className={`p-1 md:p-2 rounded-lg transition-colors ${theme === "dark" ? "hover:bg-green-600/20 text-green-600" : "hover:bg-green-50 text-green-600"
                                          }`}
                                        title="Compartilhar no WhatsApp"
                                      >
                                        <Share2 size={14} className="md:w-4 md:h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleEditClick(transaction)}
                                        className={`p-1 md:p-2 rounded-lg transition-colors ${theme === "dark" ? "hover:bg-slate-700" : "hover:bg-slate-100"
                                          }`}
                                        title="Editar transação"
                                      >
                                        <Edit2 size={14} className="md:w-4 md:h-4" />
                                      </button>
                                      <button
                                        onClick={() => handleDelete(transaction.id)}
                                        className={`p-1 md:p-2 rounded-lg transition-colors ${theme === "dark" ? "hover:bg-red-600/20 text-red-600" : "hover:bg-red-50 text-red-600"
                                          }`}
                                      >
                                        <Trash2 size={14} className="md:w-4 md:h-4" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className={`text-center py-12 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>Nenhuma transação encontrada</p>
                      )
                    }

                    {/* Pagination */}
                    {
                      transactions && transactions.length > 0 && (
                        <div className="flex justify-between items-center mt-6">
                          <Button
                            variant="outline"
                            onClick={() => setPage(Math.max(0, page - 1))}
                            disabled={page === 0}
                          >
                            Anterior
                          </Button>
                          <span className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                            Página {page + 1}
                          </span>
                          <Button
                            variant="outline"
                            onClick={() => setPage(page + 1)}
                            disabled={filteredTransactionsList.length < 20}
                          >
                            Próxima
                          </Button>
                        </div>
                      )
                    }
                  </>
                )
              }
            </div>
          </div>
        )
        }
      </main>

      {
        showEditModal && editingTransaction && editFormData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className={`rounded-xl p-6 w-full max-w-md ${theme === "dark" ? "bg-slate-900" : "bg-white"}`}>
              <h2 className={`text-2xl font-bold mb-6 ${theme === "dark" ? "text-white" : "text-slate-900"}`}>Editar Transacao</h2>
              <div className="space-y-4">
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>Tipo</label>
                  <Select value={editFormData.type} onValueChange={(value) => setEditFormData({ ...editFormData, type: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="income">Entrada</SelectItem>
                      <SelectItem value="expense">Saida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>Valor (R$)</label>
                  <Input type="number" step="0.01" value={editFormData.amount} onChange={(e) => setEditFormData({ ...editFormData, amount: parseFloat(e.target.value) })} className={`${theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`} />
                </div>
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>Data</label>
                  <Input type="date" value={editFormData.date} onChange={(e) => setEditFormData({ ...editFormData, date: e.target.value })} className={`${theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`} />
                </div>
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>Categoria</label>
                  <div className="flex gap-2">
                    {!isCreatingCategory ? (
                      <>
                        <Select value={editFormData.category} onValueChange={(value) => setEditFormData({ ...editFormData, category: value })}>
                          <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {categories?.map((cat) => (<SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          className="px-3"
                          title="Criar nova categoria"
                          onClick={() => setIsCreatingCategory(true)}
                        >
                          <Plus size={16} />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Input
                          placeholder="Nome da nova categoria"
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          className="bg-green-600 hover:bg-green-700 text-white px-3"
                          onClick={() => {
                            if (!newCategoryName.trim()) return;
                            createCategoryMutation.mutate({ name: newCategoryName, color: "#9ca3af" });
                          }}
                          disabled={createCategoryMutation.isPending}
                        >
                          {createCategoryMutation.isPending ? <Loader2 className="animate-spin" size={16} /> : "Ok"}
                        </Button>
                        <Button
                          variant="outline"
                          className="px-3"
                          onClick={() => {
                            setIsCreatingCategory(false);
                            setNewCategoryName("");
                          }}
                        >
                          <X size={16} />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>Descricao</label>
                  <Input type="text" value={editFormData.description} onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })} className={`${theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`} />
                </div>
                <div>
                  <label className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>Método de Pagamento</label>
                  <Select value={editFormData.paymentMethod} onValueChange={(value) => setEditFormData({ ...editFormData, paymentMethod: value })}>
                    <SelectTrigger className={theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem key={method} value={method}>{method}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2 mt-4 bg-slate-100 dark:bg-slate-800 p-2 rounded-lg">
                  <input
                    type="checkbox"
                    id="edit-recurring"
                    checked={editFormData.isRecurring || false}
                    onChange={(e) => setEditFormData({ ...editFormData, isRecurring: e.target.checked })}
                    className={`w-4 h-4 rounded ${theme === "dark" ? "bg-slate-700 border-slate-600" : "bg-white border-slate-300"}`}
                  />
                  <label htmlFor="edit-recurring" className={`text-sm font-medium cursor-pointer ${theme === "dark" ? "text-slate-200" : "text-slate-700"}`}>
                    Transação Recorrente (Cobrar todo mês)
                  </label>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => { setShowEditModal(false); setEditingTransaction(null); setEditFormData(null); }} className="flex-1">Cancelar</Button>
                <Button onClick={handleSaveEdit} disabled={updateMutation.isPending} className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">{updateMutation.isPending ? (<><Loader2 className="animate-spin mr-2" size={16} />Salvando...</>) : ("Salvar Alteracoes")}</Button>
              </div>
            </div>
          </div>
        )
      }

      {/* Modal de Visualização de Transação */}
      {
        showViewModal && viewingTransaction && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className={`${theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"} border rounded-2xl shadow-2xl p-6 max-w-md w-full`}>
              <div className="flex justify-between items-center mb-6">
                <h2 className={`text-xl font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                  📋 Detalhes da Transação
                </h2>
                <button
                  onClick={() => { setShowViewModal(false); setViewingTransaction(null); }}
                  className={`p-2 rounded-lg ${theme === "dark" ? "hover:bg-slate-800" : "hover:bg-slate-100"}`}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div className={`p-4 rounded-xl ${viewingTransaction.type === "income" ? "bg-green-500/10 border border-green-500/20" : "bg-red-500/10 border border-red-500/20"}`}>
                  <p className="text-sm text-slate-400 mb-1">Tipo</p>
                  <p className={`text-lg font-bold ${viewingTransaction.type === "income" ? "text-green-500" : "text-red-500"}`}>
                    {viewingTransaction.type === "income" ? "📈 Entrada" : "📉 Saída"}
                  </p>
                </div>
                <div className={`p-4 rounded-xl ${theme === "dark" ? "bg-slate-800" : "bg-slate-100"}`}>
                  <p className="text-sm text-slate-400 mb-1">Valor</p>
                  <p className={`text-2xl font-bold ${viewingTransaction.type === "income" ? "text-green-500" : "text-red-500"}`}>
                    {formatCurrency(parseFloat(viewingTransaction.amount.toString()))}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl ${theme === "dark" ? "bg-slate-800" : "bg-slate-100"}`}>
                    <p className="text-sm text-slate-400 mb-1">Categoria</p>
                    <p className={`font-semibold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                      {CATEGORY_ICONS[viewingTransaction.category] || "📌"} {viewingTransaction.category}
                    </p>
                  </div>
                  <div className={`p-4 rounded-xl ${theme === "dark" ? "bg-slate-800" : "bg-slate-100"}`}>
                    <p className="text-sm text-slate-400 mb-1">Data</p>
                    <p className={`font-semibold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                      {formatDate(viewingTransaction.date)}
                    </p>
                  </div>
                </div>
                <div className={`p-4 rounded-xl ${theme === "dark" ? "bg-slate-800" : "bg-slate-100"}`}>
                  <p className="text-sm text-slate-400 mb-1">Descrição</p>
                  <p className={`font-semibold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                    {viewingTransaction.description || "Sem descrição"}
                  </p>
                </div>
                <div className={`p-4 rounded-xl ${theme === "dark" ? "bg-slate-800" : "bg-slate-100"}`}>
                  <p className="text-sm text-slate-400 mb-1">Método de Pagamento</p>
                  <p className={`font-semibold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
                    💳 {viewingTransaction.paymentMethod || "Não informado"}
                  </p>
                </div>
                <div className={`p-4 rounded-xl ${theme === "dark" ? "bg-slate-800/50" : "bg-slate-50"}`}>
                  <p className="text-sm text-slate-400 mb-1">ID da Transação</p>
                  <p className={`font-mono text-sm ${theme === "dark" ? "text-slate-300" : "text-slate-600"}`}>
                    #{viewingTransaction.id}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => { setShowViewModal(false); setViewingTransaction(null); }}
                  className="flex-1"
                >
                  Fechar
                </Button>
                <Button
                  onClick={() => {
                    setShowViewModal(false);
                    handleEditClick(viewingTransaction);
                  }}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  <Edit2 size={16} className="mr-2" />
                  Editar
                </Button>
              </div>
            </div>
          </div>
        )
      }

      <BudgetModal
        isOpen={showBudgetModal}
        onClose={() => setShowBudgetModal(false)}
        theme={theme}
        categories={categories || []}
        onBudgetUpdated={() => {
          refetchBudgets();
          setShowBudgetModal(false);
        }}
      />

      {/* Modal de Configuracao de Limites */}
      <Dialog open={showLimitModal} onOpenChange={setShowLimitModal}>
        <DialogContent className={theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white"}>
          <DialogHeader>
            <DialogTitle>Configurar Limite de Gastos</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Limite Global Mensal</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={globalLimit}
                  onChange={(e) => setGlobalLimit(Number(e.target.value))}
                  className={theme === "dark" ? "bg-slate-800 border-slate-700" : ""}
                  placeholder="5000"
                />
                <span className="flex items-center text-sm font-medium">R$</span>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowLimitModal(false)}>
                Cancelar
              </Button>
              <Button
                onClick={() => {
                  updateLimitMutation.mutate({ globalSpendingLimit: globalLimit });
                  setShowLimitModal(false);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Salvar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <FinancialCopilot />
    </div >
  );
}
