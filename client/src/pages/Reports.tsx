import { useState, useMemo } from "react";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate } from "@shared/formatters";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { LineChart, Line, AreaChart, Area, ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Download, ArrowUpRight, ArrowDownLeft, TrendingUp } from "lucide-react";
import { exportReportsToPDF } from "@/lib/pdfExport";

const CATEGORY_ICONS: Record<string, string> = {
  "Alimentação": "🍔",
  "Transporte": "🚗",
  "Saúde": "🏥",
  "Educação": "📚",
  "Entretenimento": "🎬",
  "Utilidades": "💡",
  "Outros": "📌",
};

const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];

export default function Reports() {
  const { theme } = useTheme();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterType, setFilterType] = useState<"all" | "income" | "expense">("all");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Fetch data
  const { data: transactions } = trpc.transactions.list.useQuery({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  const { data: categories } = trpc.categories.list.useQuery();

  // Filter transactions by type and category
  const filteredTransactions = transactions?.filter(t => {
    const typeMatch = filterType === "all" || t.type === filterType;
    const categoryMatch = filterCategory === "all" || t.category === filterCategory;
    return typeMatch && categoryMatch;
  }) || [];
  const { data: stats } = trpc.transactions.stats.useQuery({
    startDate: startDate || undefined,
    endDate: endDate || undefined,
  });

  // Process data for charts
  const chartData = useMemo(() => {
    if (!transactions) return [];

    const grouped: Record<string, { date: string; income: number; expense: number }> = {};

    transactions.forEach((t) => {
      const date = t.date;
      if (!grouped[date]) {
        grouped[date] = { date, income: 0, expense: 0 };
      }
      const amount = parseFloat(t.amount.toString());
      if (t.type === "income") {
        grouped[date].income += amount;
      } else {
        grouped[date].expense += amount;
      }
    });

    return Object.values(grouped).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [transactions]);

  // Category distribution
  const categoryData = useMemo(() => {
    if (!transactions) return [];

    const grouped: Record<string, number> = {};
    transactions.forEach((t) => {
      if (t.type === "expense") {
        const amount = parseFloat(t.amount.toString());
        grouped[t.category] = (grouped[t.category] || 0) + amount;
      }
    });

    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [transactions]);

  // Trending analysis
  const trendingData = useMemo(() => {
    if (!transactions || transactions.length < 2) return null;

    const sorted = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const mid = Math.floor(sorted.length / 2);

    const firstHalf = sorted.slice(0, mid);
    const secondHalf = sorted.slice(mid);

    const firstAvg = firstHalf.reduce((sum, t) => sum + (t.type === "expense" ? parseFloat(t.amount.toString()) : 0), 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, t) => sum + (t.type === "expense" ? parseFloat(t.amount.toString()) : 0), 0) / secondHalf.length;

    const trend = ((secondAvg - firstAvg) / firstAvg) * 100;

    return { trend, firstAvg, secondAvg };
  }, [transactions]);

  return (
    <div className={`min-h-screen ${theme === "dark" ? "bg-slate-950" : "bg-slate-50"}`}>
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <a href="/" className={`inline-block mb-4 px-4 py-2 rounded-lg font-semibold transition-colors ${
            theme === "dark"
              ? "bg-slate-800 text-slate-300 hover:bg-slate-700"
              : "bg-slate-200 text-slate-700 hover:bg-slate-300"
          }`}>
            ← Voltar
          </a>
          <h1 className={`text-4xl font-bold mb-2 ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
            Relatórios Avançados
          </h1>
          <p className={`${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
            Análise detalhada de suas transações financeiras
          </p>
        </div>

        {/* Filters */}
        <div className={`rounded-xl p-6 mb-8 ${theme === "dark" ? "bg-slate-900 border border-slate-800" : "bg-white border border-slate-200"}`}>
          <h2 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-white" : "text-slate-900"}`}>Filtros</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Data Inicial
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`${theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}
              />
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Data Final
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`${theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}
              />
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Tipo
              </label>
              <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
                <SelectTrigger className={`${theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="income">Entradas</SelectItem>
                  <SelectItem value="expense">Saídas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className={`block text-sm font-semibold mb-2 ${theme === "dark" ? "text-slate-300" : "text-slate-700"}`}>
                Categoria
              </label>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className={`${theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => {
                  setStartDate("");
                  setEndDate("");
                  setFilterType("all");
                  setFilterCategory("all");
                }}
                variant="outline"
                className="w-full"
              >
                Limpar Filtros
              </Button>
              <Button
                onClick={exportReportsToPDF}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Exportar PDF
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className={`rounded-xl p-6 ${theme === "dark" ? "bg-slate-900 border border-slate-800" : "bg-white border border-slate-200"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                    Total Entradas
                  </p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.totalIncome)}</p>
                </div>
                <ArrowDownLeft size={32} className="text-green-600/20" />
              </div>
            </div>

            <div className={`rounded-xl p-6 ${theme === "dark" ? "bg-slate-900 border border-slate-800" : "bg-white border border-slate-200"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                    Total Saídas
                  </p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.totalExpense)}</p>
                </div>
                <ArrowUpRight size={32} className="text-red-600/20" />
              </div>
            </div>

            <div className={`rounded-xl p-6 ${theme === "dark" ? "bg-slate-900 border border-slate-800" : "bg-white border border-slate-200"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-semibold mb-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                    Saldo
                  </p>
                  <p className={`text-2xl font-bold ${stats.totalIncome - stats.totalExpense >= 0 ? "text-blue-600" : "text-red-600"}`}>
                    {formatCurrency(stats.totalIncome - stats.totalExpense)}
                  </p>
                </div>
              </div>
            </div>

            {trendingData && (
              <div className={`rounded-xl p-6 ${theme === "dark" ? "bg-slate-900 border border-slate-800" : "bg-white border border-slate-200"}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className={`text-sm font-semibold mb-1 ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                      Tendência
                    </p>
                    <p className={`text-2xl font-bold ${trendingData.trend > 0 ? "text-red-600" : "text-green-600"}`}>
                      {trendingData.trend > 0 ? "+" : ""}{trendingData.trend.toFixed(1)}%
                    </p>
                  </div>
                  <TrendingUp size={32} className={trendingData.trend > 0 ? "text-red-600/20" : "text-green-600/20"} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Line Chart */}
          <div className={`rounded-xl p-6 ${theme === "dark" ? "bg-slate-900 border border-slate-800" : "bg-white border border-slate-200"}`}>
            <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
              Evolução Diária
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#334155" : "#e2e8f0"} />
                <XAxis dataKey="date" stroke={theme === "dark" ? "#94a3b8" : "#64748b"} />
                <YAxis stroke={theme === "dark" ? "#94a3b8" : "#64748b"} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: theme === "dark" ? "#1e293b" : "#ffffff",
                    border: `1px solid ${theme === "dark" ? "#334155" : "#e2e8f0"}`,
                    borderRadius: "8px",
                  }}
                  formatter={(value: any) => formatCurrency(value)}
                />
                <Legend />
                <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="Entradas" />
                <Line type="monotone" dataKey="expense" stroke="#ef4444" strokeWidth={2} name="Saídas" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className={`rounded-xl p-6 ${theme === "dark" ? "bg-slate-900 border border-slate-800" : "bg-white border border-slate-200"}`}>
            <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
              Distribuição por Categoria
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${formatCurrency(value)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Area Chart */}
        <div className={`rounded-xl p-6 mb-8 ${theme === "dark" ? "bg-slate-900 border border-slate-800" : "bg-white border border-slate-200"}`}>
          <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
            Acumulado ao Longo do Tempo
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke={theme === "dark" ? "#334155" : "#e2e8f0"} />
              <XAxis dataKey="date" stroke={theme === "dark" ? "#94a3b8" : "#64748b"} />
              <YAxis stroke={theme === "dark" ? "#94a3b8" : "#64748b"} />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme === "dark" ? "#1e293b" : "#ffffff",
                  border: `1px solid ${theme === "dark" ? "#334155" : "#e2e8f0"}`,
                  borderRadius: "8px",
                }}
                formatter={(value: any) => formatCurrency(value)}
              />
              <Legend />
              <Area type="monotone" dataKey="income" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Entradas" />
              <Area type="monotone" dataKey="expense" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Saídas" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className={`rounded-xl p-6 ${theme === "dark" ? "bg-slate-900 border border-slate-800" : "bg-white border border-slate-200"}`}>
          <h3 className={`text-lg font-semibold mb-4 ${theme === "dark" ? "text-white" : "text-slate-900"}`}>
            Detalhamento por Categoria
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className={`border-b ${theme === "dark" ? "border-slate-800" : "border-slate-200"}`}>
                  <th className={`text-left px-4 py-3 font-semibold ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                    Categoria
                  </th>
                  <th className={`text-right px-4 py-3 font-semibold ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                    Total
                  </th>
                  <th className={`text-right px-4 py-3 font-semibold ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                    Percentual
                  </th>
                </tr>
              </thead>
              <tbody>
                {categoryData.map((cat, idx) => {
                  const total = categoryData.reduce((sum, c) => sum + c.value, 0);
                  const percentage = ((cat.value / total) * 100).toFixed(1);
                  return (
                    <tr key={idx} className={`border-b ${theme === "dark" ? "border-slate-800 hover:bg-slate-800/50" : "border-slate-200 hover:bg-slate-50"}`}>
                      <td className="px-4 py-3 flex items-center gap-2">
                        <span>{CATEGORY_ICONS[cat.name] || "📌"}</span>
                        <span>{cat.name}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(cat.value)}</td>
                      <td className="px-4 py-3 text-right">{percentage}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
