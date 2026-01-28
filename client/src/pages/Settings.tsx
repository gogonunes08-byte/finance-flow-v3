import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertCircle, Settings as SettingsIcon, Download, ArrowLeft, Loader2, Wallet } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function Settings() {
  const [, setLocation] = useLocation();

  const handleGoBack = () => {
    setLocation('/');
  };

  const BackupButton = () => {
    const backupMutation = trpc.backup.create.useMutation();

    return (
      <Button
        onClick={() => {
          if (confirm("Iniciar backup para o Google Drive?")) {
            backupMutation.mutate(undefined, {
              onSuccess: (data: any) => toast.success(`✅ Backup realizado! \nArquivo: ${data.fileId}`),
              onError: (err) => toast.error("❌ Erro no backup: " + err.message)
            });
          }
        }}
        disabled={backupMutation.isPending}
        className="bg-green-600 hover:bg-green-700"
      >
        {backupMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
        Fazer Backup
      </Button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl md:text-4xl font-bold text-white flex items-center gap-3">
              <SettingsIcon className="w-8 h-8 text-blue-400" />
              Configurações
            </h1>
            <Button
              onClick={handleGoBack}
              variant="outline"
              size="lg"
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar
            </Button>
          </div>
          <p className="text-gray-300 text-lg">
            Gerencie suas preferências
          </p>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="general" className="gap-2">
              <SettingsIcon className="w-4 h-4" />
              Geral
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-2">
              <AlertCircle className="w-4 h-4" />
              Segurança
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Configurações Gerais</CardTitle>
                <CardDescription className="text-gray-400">
                  Preferências do sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400">Em breve...</p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security">
            <Card className="bg-slate-800/50 border-slate-700">
              <CardHeader>
                <CardTitle className="text-white">Segurança & Backup</CardTitle>
                <CardDescription className="text-gray-400">
                  Gerencie sua conta e backups
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-slate-700/50 rounded-xl flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-blue-400" />
                      Conta Google
                    </h3>
                    <p className="text-sm text-gray-400">
                      Conecte para habilitar o backup automático
                    </p>
                  </div>
                  <Button
                    onClick={() => window.location.href = "/api/auth/google"}
                    variant="outline"
                    className="gap-2"
                  >
                    Google Login
                  </Button>
                </div>

                <div className="p-4 bg-slate-700/50 rounded-xl flex items-center justify-between">
                  <div>
                    <h3 className="text-white font-semibold flex items-center gap-2">
                      <Download className="w-5 h-5 text-green-400" />
                      Backup no Drive
                    </h3>
                    <p className="text-sm text-gray-400">
                      Salvar dados atuais no Google Drive
                    </p>
                  </div>
                  <BackupButton />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
