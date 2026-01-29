import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@shared/formatters";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Loader2, Plus, Trash2, TrendingUp, DollarSign, RefreshCw, Car, Building2, Bitcoin } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORY_COLORS = {
    crypto: "#f59e0b", // Orange/Gold
    fii: "#6366f1", // Indigo
    vehicle: "#10b981", // Emerald
    cash: "#22c55e", // Green
    stock: "#3b82f6", // Blue
    other: "#94a3b8", // Slate
};

const CATEGORY_LABELS: Record<string, string> = {
    crypto: "Criptomoedas",
    fii: "Fundos Imobiliários",
    vehicle: "Veículos",
    cash: "Reserva / Caixa",
    stock: "Ações",
    other: "Outros",
};

const CATEGORY_ICONS: Record<string, any> = {
    crypto: Bitcoin,
    fii: Building2,
    vehicle: Car,
    cash: DollarSign,
    stock: TrendingUp,
    other: TrendingUp,
};

export default function Investments() {
    const { theme } = useTheme();
    const [showAddModal, setShowAddModal] = useState(false);
    const [usdRate, setUsdRate] = useState(5.80); // Manual helper for now

    const [formData, setFormData] = useState({
        name: "",
        category: "crypto",
        amount: "",
        currentPrice: "",
        currency: "BRL" as "BRL" | "USD"
    });

    const utils = trpc.useUtils();
    const { data: investments, isLoading } = trpc.investments.list.useQuery();

    const createMutation = trpc.investments.create.useMutation({
        onSuccess: () => {
            toast.success("Ativo adicionado!");
            setShowAddModal(false);
            setFormData({ name: "", category: "crypto", amount: "", currentPrice: "", currency: "BRL" });
            utils.investments.invalidate();
        }
    });

    const deleteMutation = trpc.investments.delete.useMutation({
        onSuccess: () => {
            toast.success("Ativo removido.");
            utils.investments.invalidate();
        }
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name || !formData.amount || !formData.currentPrice) return;

        createMutation.mutate({
            name: formData.name,
            category: formData.category,
            amount: parseFloat(formData.amount),
            currentPrice: parseFloat(formData.currentPrice),
            currency: formData.currency
        });
    };

    const processedData = useMemo(() => {
        if (!investments) return { total: 0, byCategory: [] };

        let totalBrl = 0;
        const catMap = new Map();

        investments.forEach(inv => {
            const amount = parseFloat(inv.amount.toString());
            const price = parseFloat(inv.currentPrice.toString());
            let totalValue = amount * price;

            if (inv.currency === "USD") {
                totalValue = totalValue * usdRate;
            }

            totalBrl += totalValue;

            const existing = catMap.get(inv.category) || 0;
            catMap.set(inv.category, existing + totalValue);
        });

        const byCategory = Array.from(catMap.entries()).map(([name, value]) => ({
            name: CATEGORY_LABELS[name] || name,
            key: name,
            value: value
        }));

        return { total: totalBrl, byCategory };
    }, [investments, usdRate]);

    return (
        <div className={`min-h-screen p-4 md:p-8 transition-colors duration-300 ${theme === "dark" ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
            <div className="max-w-7xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-500 to-blue-500">
                            Meus Investimentos
                        </h1>
                        <p className={`text-sm ${theme === "dark" ? "text-slate-400" : "text-slate-600"}`}>
                            Gerencie seu patrimônio e alocação de ativos.
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className={`px-4 py-2 rounded-lg border ${theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                            <p className="text-xs text-slate-500 mb-1">Cotação Dólar (Ref)</p>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold">R$</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={usdRate}
                                    onChange={(e) => setUsdRate(parseFloat(e.target.value))}
                                    className="w-16 bg-transparent outline-none font-bold text-sm border-b border-slate-500 focus:border-blue-500"
                                />
                            </div>
                        </div>
                        <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                            <DialogTrigger asChild>
                                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                                    <Plus size={18} className="mr-2" /> Novo Ativo
                                </Button>
                            </DialogTrigger>
                            <DialogContent className={theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white"}>
                                <DialogHeader>
                                    <DialogTitle>Adicionar Investimento</DialogTitle>
                                </DialogHeader>
                                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1.5">Nome do Ativo</label>
                                        <Input
                                            placeholder="Ex: Bitcoin, FII HGLG11, Moto Honda"
                                            value={formData.name}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                                            className={theme === "dark" ? "bg-slate-800 border-slate-700" : ""}
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Categoria</label>
                                            <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
                                                <SelectTrigger className={theme === "dark" ? "bg-slate-800 border-slate-700" : ""}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="crypto">🪙 Cripto</SelectItem>
                                                    <SelectItem value="fii">🏢 FIIs</SelectItem>
                                                    <SelectItem value="stock">📈 Ações</SelectItem>
                                                    <SelectItem value="vehicle">🏍️ Veículo</SelectItem>
                                                    <SelectItem value="cash">💵 Caixa/Dólar</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Moeda</label>
                                            <Select value={formData.currency} onValueChange={(v: "BRL" | "USD") => setFormData({ ...formData, currency: v })}>
                                                <SelectTrigger className={theme === "dark" ? "bg-slate-800 border-slate-700" : ""}>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="BRL">R$ Real</SelectItem>
                                                    <SelectItem value="USD">$ Dólar</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Quantidade</label>
                                            <Input
                                                type="number" step="0.00000001"
                                                placeholder="0.00"
                                                value={formData.amount}
                                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                                className={theme === "dark" ? "bg-slate-800 border-slate-700" : ""}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium mb-1.5">Preço Unitário</label>
                                            <Input
                                                type="number" step="0.01"
                                                placeholder="0.00"
                                                value={formData.currentPrice}
                                                onChange={e => setFormData({ ...formData, currentPrice: e.target.value })}
                                                className={theme === "dark" ? "bg-slate-800 border-slate-700" : ""}
                                            />
                                        </div>
                                    </div>

                                    <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-700" disabled={createMutation.isPending}>
                                        {createMutation.isPending ? "Salvando..." : "Adicionar"}
                                    </Button>
                                </form>
                            </DialogContent>
                        </Dialog>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Chart */}
                    <div className={`lg:col-span-2 p-6 rounded-2xl border ${theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                        <h3 className="text-lg font-bold mb-6">Alocação de Patrimônio</h3>
                        {isLoading ? (
                            <div className="h-[300px] flex items-center justify-center"><Loader2 className="animate-spin" /></div>
                        ) : processedData.total > 0 ? (
                            <div className="h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={processedData.byCategory}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={80}
                                            outerRadius={110}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {processedData.byCategory.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.key as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.other} stroke="none" />
                                            ))}
                                        </Pie>
                                        <Tooltip
                                            formatter={(value: number) => formatCurrency(value)}
                                            contentStyle={{ backgroundColor: theme === "dark" ? "#1e293b" : "#fff", borderColor: theme === "dark" ? "#334155" : "#e2e8f0" }}
                                        />
                                        <Legend />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                        ) : (
                            <div className="h-[300px] flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-slate-700 rounded-xl">
                                <TrendingUp size={48} className="mb-4 opacity-50" />
                                <p>Nenhum investimento cadastrado.</p>
                            </div>
                        )}
                    </div>

                    {/* Total Summary */}
                    <div className="space-y-6">
                        <div className={`p-6 rounded-2xl border bg-gradient-to-br from-emerald-900 to-slate-900 border-emerald-800 text-white`}>
                            <p className="text-emerald-200 text-sm font-medium mb-1">Patrimônio Total Estimado</p>
                            <h2 className="text-4xl font-bold">{formatCurrency(processedData.total)}</h2>
                            <div className="mt-4 flex gap-2">
                                <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                                    {investments?.length || 0} Ativos
                                </div>
                                <div className="px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold border border-blue-500/30">
                                    Manual Mode
                                </div>
                            </div>
                        </div>

                        {/* Breakdown List */}
                        <div className={`p-6 rounded-2xl border ${theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                            <h3 className="font-bold mb-4 text-sm uppercase tracking-wider text-slate-500">Por Categoria</h3>
                            <div className="space-y-3">
                                {processedData.byCategory.map((cat) => (
                                    <div key={cat.key} className="flex justify-between items-center">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat.key as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.other }} />
                                            <span className="text-sm font-medium">{cat.name}</span>
                                        </div>
                                        <span className="text-sm font-bold">{formatCurrency(cat.value)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detailed Assets List */}
                <div className={`rounded-xl border overflow-hidden ${theme === "dark" ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"}`}>
                    <div className="p-4 border-b border-slate-800 flex justify-between items-center">
                        <h3 className="font-bold">Meus Ativos</h3>
                        <Button variant="ghost" size="sm" onClick={() => utils.investments.invalidate()}>
                            <RefreshCw size={14} className="mr-2" /> Atualizar
                        </Button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className={`text-xs uppercase font-semibold text-slate-500 ${theme === "dark" ? "bg-slate-950" : "bg-slate-50"}`}>
                                <tr>
                                    <th className="px-4 py-3 text-left">Nome</th>
                                    <th className="px-4 py-3 text-left">Categoria</th>
                                    <th className="px-4 py-3 text-right">Qtd</th>
                                    <th className="px-4 py-3 text-right">Preço Unit.</th>
                                    <th className="px-4 py-3 text-right">Total (R$)</th>
                                    <th className="px-4 py-3 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800">
                                {investments?.map((inv) => {
                                    const Icon = CATEGORY_ICONS[inv.category] || TrendingUp;
                                    const totalVal = parseFloat(inv.amount.toString()) * parseFloat(inv.currentPrice.toString());
                                    const finalVal = inv.currency === "USD" ? totalVal * usdRate : totalVal;

                                    return (
                                        <tr key={inv.id} className="hover:bg-slate-800/50 transition-colors">
                                            <td className="px-4 py-3 font-medium flex items-center gap-2">
                                                <div className={`p-1.5 rounded-lg ${theme === "dark" ? "bg-slate-800" : "bg-slate-100"}`}>
                                                    <Icon size={14} />
                                                </div>
                                                {inv.name}
                                            </td>
                                            <td className="px-4 py-3 text-slate-500">{CATEGORY_LABELS[inv.category]}</td>
                                            <td className="px-4 py-3 text-right font-mono">{parseFloat(inv.amount.toString())}</td>
                                            <td className="px-4 py-3 text-right">
                                                {inv.currency === "USD" ? "$ " : "R$ "}
                                                {parseFloat(inv.currentPrice.toString()).toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3 text-right font-bold text-emerald-500">
                                                {formatCurrency(finalVal)}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <button
                                                    onClick={() => deleteMutation.mutate({ id: inv.id })}
                                                    className="text-red-500 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {investments?.length === 0 && (
                            <div className="p-8 text-center text-slate-500">
                                Nenhum ativo encontrado. Adicione um novo!
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
