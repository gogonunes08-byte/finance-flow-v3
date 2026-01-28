import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Send, X, Sparkles, User, CheckCircle2, Camera, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { formatCurrency } from "@shared/formatters";
import { createWorker } from "tesseract.js";

interface Message {
    id: string;
    text: string;
    sender: "user" | "bot";
    timestamp: Date;
    image?: string;
}

const CATEGORY_KEYWORDS: Record<string, string> = {
    "comida": "Alimentação", "lanche": "Alimentação", "almoço": "Alimentação", "jantar": "Alimentação", "mercado": "Alimentação", "pizza": "Alimentação", "burger": "Alimentação",
    "uber": "Transporte", "gasolina": "Transporte", "ônibus": "Transporte",
    "salário": "Trabalho", "freela": "Trabalho",
    "luz": "Utilidades", "água": "Utilidades", "internet": "Utilidades",
    "curso": "Educação", "livro": "Educação",
    "hospital": "Saúde", "remédio": "Saúde",
};

export function FinancialCopilot() {
    const { theme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "welcome",
            text: "Olá! Agora posso ler recibos! Clique na câmera 📷 e envie uma foto da nota.",
            sender: "bot",
            timestamp: new Date(),
        },
    ]);
    const scrollRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const utils = trpc.useUtils();
    const { data: stats } = trpc.transactions.stats.useQuery({});

    const createTransactionMutation = trpc.transactions.create.useMutation({
        onSuccess: () => {
            utils.transactions.invalidate();
        }
    });

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollIntoView({ behavior: "smooth" });
        }
    }, [messages, isOpen, isTyping, isProcessingImage]);

    const processImage = async (file: File) => {
        setIsProcessingImage(true);

        // Show image
        const imageUrl = URL.createObjectURL(file);
        const userMsg: Message = {
            id: Date.now().toString(),
            text: "📸 Analisar este comprovante",
            sender: "user",
            timestamp: new Date(),
            image: imageUrl
        };
        setMessages(prev => [...prev, userMsg]);

        try {
            const worker = await createWorker("eng");
            const ret = await worker.recognize(file);
            const text = ret.data.text;
            await worker.terminate();

            // Simple logic to find the largest number
            const numbers = text.match(/\d+[.,]\d{2}/g);

            let foundAmount = 0;
            if (numbers) {
                const validNumbers = numbers.map(n => parseFloat(n.replace(',', '.'))).filter(n => !isNaN(n));
                if (validNumbers.length > 0) {
                    foundAmount = Math.max(...validNumbers);
                }
            }

            setIsProcessingImage(false);

            if (foundAmount > 0) {
                const responseText = await processCommand(`Gastei ${foundAmount.toFixed(2)} com Compra (OCR)`);

                const botMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    text: `Li o comprovante! Encontrei o valor de **R$ ${foundAmount.toFixed(2)}**.\n\n${responseText}`,
                    sender: "bot",
                    timestamp: new Date(),
                };
                setMessages((prev) => [...prev, botMsg]);
            } else {
                const botMsg: Message = {
                    id: (Date.now() + 1).toString(),
                    text: "Não consegui identificar o valor total na imagem. Tente uma foto mais clara ou digite o valor.",
                    sender: "bot",
                    timestamp: new Date(),
                };
                setMessages((prev) => [...prev, botMsg]);
            }

        } catch (error) {
            console.error(error);
            setIsProcessingImage(false);
            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: "Erro ao processar imagem. Tente novamente.",
                sender: "bot",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, botMsg]);
        }
    };

    const processCommand = async (text: string) => {
        const lower = text.toLowerCase();

        const isExpense = lower.includes("gastei") || lower.includes("paguei") || lower.includes("compra") || lower.includes("transferi") || lower.includes("saída");
        const isIncome = lower.includes("recebi") || lower.includes("ganhei") || lower.includes("venda") || lower.includes("entrou") || lower.includes("depósito") || lower.includes("salário") || lower.includes("pagamento");

        if (isExpense || isIncome) {
            const numberMatch = text.match(/(\d+([.,]\d{1,2})?)/);

            if (numberMatch) {
                let amount = parseFloat(numberMatch[0].replace(',', '.'));
                const type = isIncome ? "income" : "expense";

                let category = "Outros";
                for (const [key, value] of Object.entries(CATEGORY_KEYWORDS)) {
                    if (lower.includes(key)) {
                        category = value;
                        break;
                    }
                }

                let description = text
                    .replace(/gastei|paguei|recebi|ganhei|reais|com|em|no|na/gi, "")
                    .replace(numberMatch[0], "")
                    .trim();

                description = description.charAt(0).toUpperCase() + description.slice(1) || (isIncome ? "Entrada via Chat" : "Gasto via Chat");

                try {
                    await createTransactionMutation.mutateAsync({
                        type,
                        amount,
                        category,
                        description,
                        date: new Date().toISOString().split('T')[0],
                        paymentMethod: "Outro"
                    });

                    return `✅ Feito! Registrei **${formatCurrency(amount)}** em *${category}* (${description}).`;
                } catch (e) {
                    console.error(e);
                    return "Ops! Tive um erro ao tentar salvar. Tente novamente.";
                }
            }
        }

        if (!stats) return "Estou sincronizando... um momento.";

        if (lower.includes("saldo")) {
            const status = stats.balance >= 0 ? "positivo 🟢" : "negativo 🔴";
            return `Seu saldo atual é de **${formatCurrency(stats.balance)}**. Está ${status}.`;
        }

        if (lower.includes("gasto") || lower.includes("despesa") || lower.includes("saiu")) {
            return `O total de suas despesas no período é **${formatCurrency(stats.totalExpense)}**.`;
        }

        if (lower.includes("entrada") || lower.includes("ganh") || lower.includes("receita")) {
            return `Você acumulou **${formatCurrency(stats.totalIncome)}** em entradas.`;
        }

        if (lower.includes("oi") || lower.includes("olá")) {
            return "Olá! Como posso ajudar nas suas economias hoje?";
        }

        return "Desculpe, ainda estou aprendendo. Tente perguntar: 'Qual meu saldo?' ou 'Gastei 50 no Uber'.";
    };

    const handleSendMessage = async () => {
        if (!inputValue.trim()) return;

        const userText = inputValue;
        const userMsg: Message = {
            id: Date.now().toString(),
            text: userText,
            sender: "user",
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setInputValue("");
        setIsTyping(true);

        setTimeout(async () => {
            const responseText = await processCommand(userText);
            setIsTyping(false);

            const botMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: responseText,
                sender: "bot",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, botMsg]);
        }, 800);
    };

    return (
        <>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className={`fixed z-50 flex flex-col shadow-2xl overflow-hidden
              md:bottom-24 md:right-6 md:w-96 md:h-[600px] md:rounded-2xl
              bottom-0 left-0 right-0 top-0 h-[100dvh] w-full rounded-none
              ${theme === "dark" ? "bg-slate-900 border border-slate-700" : "bg-white border border-slate-200"}
            `}
                    >
                        {/* Header */}
                        <div className={`p-4 border-b flex justify-between items-center ${theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-slate-100 border-slate-200"}`}>
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600 rounded-lg">
                                    <Bot className="text-white w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className={`font-bold ${theme === "dark" ? "text-white" : "text-slate-900"}`}>Copiloto IA</h3>
                                    <p className="text-xs text-green-500 font-medium flex items-center gap-1">
                                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Online
                                    </p>
                                </div>
                            </div>
                            <Button size="icon" variant="ghost" onClick={() => setIsOpen(false)}>
                                <X className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Chat Area */}
                        <ScrollArea className="flex-1 p-4 bg-opacity-50">
                            <div className="space-y-4">
                                {messages.map((msg) => (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        key={msg.id}
                                        className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                                    >
                                        <div
                                            className={`max-w-[85%] p-3 rounded-2xl text-sm ${msg.sender === "user"
                                                    ? "bg-blue-600 text-white rounded-tr-none"
                                                    : `${theme === "dark" ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-800"} rounded-tl-none`
                                                }`}
                                        >
                                            {msg.image && <img src={msg.image} alt="Upload" className="mb-2 rounded-lg max-h-40 w-full object-cover" />}
                                            {msg.text}
                                            <p className={`text-[10px] mt-1 opacity-70 ${msg.sender === "user" ? "text-blue-100" : "text-slate-500"}`}>
                                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </motion.div>
                                ))}
                                {(isTyping || isProcessingImage) && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                                        <div className={`px-3 py-2 rounded-2xl rounded-tl-none text-xs flex items-center gap-2 ${theme === "dark" ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500"}`}>
                                            {isProcessingImage ? <><Loader2 className="w-3 h-3 animate-spin" /> Lendo Nota...</> : "Digitando..."}
                                        </div>
                                    </motion.div>
                                )}
                                <div ref={scrollRef} />
                            </div>
                        </ScrollArea>

                        {/* Input Area */}
                        <div className={`p-4 border-t ${theme === "dark" ? "bg-slate-800/50 border-slate-800" : "bg-white border-slate-100"}`}>
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    handleSendMessage();
                                }}
                                className="flex gap-2"
                            >
                                <input
                                    type="file"
                                    accept="image/*"
                                    capture="environment"
                                    className="hidden"
                                    ref={fileInputRef}
                                    onChange={(e) => {
                                        if (e.target.files && e.target.files[0]) {
                                            processImage(e.target.files[0]);
                                        }
                                    }}
                                />
                                <Button type="button" size="icon" variant="outline" onClick={() => fileInputRef.current?.click()} className={`${theme === "dark" ? "bg-slate-800 border-slate-700" : "bg-white border-slate-200"}`}>
                                    <Camera className="w-4 h-4" />
                                </Button>
                                <Input
                                    value={inputValue}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    placeholder="Digite ou envie foto..."
                                    className={`flex-1 ${theme === "dark" ? "bg-slate-900 border-slate-700" : "bg-slate-50 border-slate-200"}`}
                                />
                                <Button type="submit" size="icon" className="bg-blue-600 hover:bg-blue-700 text-white shrink-0">
                                    <Send className="w-4 h-4" />
                                </Button>
                            </form>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Floating Button (FAB) */}
            <AnimatePresence>
                {!isOpen && (
                    <motion.button
                        initial={{ scale: 0, rotate: 180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0, rotate: -180 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsOpen(true)}
                        className="fixed bottom-6 right-6 md:bottom-10 md:right-10 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-lg flex items-center justify-center text-white z-50 hover:shadow-blue-500/50 transition-shadow"
                    >
                        <Sparkles className="w-6 h-6 animate-pulse" />
                    </motion.button>
                )}
            </AnimatePresence>
        </>
    );
}
