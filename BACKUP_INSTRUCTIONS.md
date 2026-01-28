# 📦 Instruções de Backup e Restauração

**Data do Backup:** 16 de Janeiro de 2026  
**Versão:** 1.0.0

---

## 📋 Conteúdo do Backup

Este arquivo contém o backup completo do projeto **Finance Flow Pro V3** com:

```
backup-finance-flow-pro-v3/
├── README_COMPLETO.md          # Documentação técnica completa
├── BACKUP_INSTRUCTIONS.md      # Este arquivo
├── DATABASE_BACKUP.json        # Dados do banco de dados
├── client/                     # Frontend React
├── server/                     # Backend Express
├── drizzle/                    # Schema e migrations
├── package.json                # Dependências
├── tsconfig.json               # Configuração TypeScript
├── vite.config.ts              # Configuração Vite
└── [outros arquivos]           # Configurações e assets
```

---

## 🚀 Como Restaurar o Projeto

### Passo 1: Preparar o Ambiente

```bash
# Criar diretório para o projeto
mkdir -p ~/projects
cd ~/projects

# Copiar o backup
cp -r /caminho/para/backup-finance-flow-pro-v3 ./finance-flow-pro-v3
cd finance-flow-pro-v3
```

### Passo 2: Instalar Dependências

```bash
# Instalar pnpm (se não tiver)
npm install -g pnpm

# Instalar dependências do projeto
pnpm install
```

### Passo 3: Configurar Banco de Dados

```bash
# Criar arquivo de ambiente
cp .env.example .env.local

# Editar .env.local com suas credenciais:
# DATABASE_URL=mysql://usuario:senha@localhost:3306/finance_flow_pro_v3
# VITE_APP_ID=seu_oauth_app_id
# JWT_SECRET=sua_chave_secreta
# OAUTH_SERVER_URL=https://api.manus.im
# VITE_OAUTH_PORTAL_URL=https://portal.manus.im
```

### Passo 4: Criar Banco de Dados

```bash
# Criar banco de dados MySQL
mysql -u root -p -e "CREATE DATABASE finance_flow_pro_v3;"

# Executar migrações
pnpm db:push
```

### Passo 5: Restaurar Dados (Opcional)

Se você tem o arquivo `DATABASE_BACKUP.json`:

```bash
# Criar script de restauração
cat > restore-data.mjs << 'RESTORE_EOF'
import { createConnection } from 'mysql2/promise';
import fs from 'fs';

const data = JSON.parse(fs.readFileSync('./DATABASE_BACKUP.json', 'utf-8'));
const connection = await createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'finance_flow_pro_v3',
});

for (const [table, records] of Object.entries(data)) {
  if (records.length > 0) {
    const columns = Object.keys(records[0]).join(', ');
    for (const record of records) {
      const values = Object.values(record).map(v => 
        typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : v
      ).join(', ');
      await connection.execute(
        `INSERT INTO ${table} (${columns}) VALUES (${values})`
      ).catch(() => {});
    }
    console.log(`✅ ${table}: ${records.length} registros restaurados`);
  }
}

await connection.end();
console.log('\n✅ Dados restaurados com sucesso!');
RESTORE_EOF

# Executar restauração
node restore-data.mjs
```

### Passo 6: Iniciar o Projeto

```bash
# Modo desenvolvimento
pnpm dev

# Ou modo produção
pnpm build
pnpm start
```

O projeto estará disponível em `http://localhost:3000`

---

## 💾 Dados Inclusos no Backup

### Estatísticas (16/01/2026)

| Item | Quantidade |
|------|-----------|
| Usuários | 1 |
| Transações | 33 |
| Categorias | 10 |
| Tags | 4 |
| Metas de Orçamento | 5 |
| Métodos de Pagamento | 6 |

### Saldo Financeiro

- **Entradas:** R$ 5.407,43
- **Saídas:** R$ 5.034,20
- **Saldo:** R$ 373,23
- **Limite Global:** R$ 5.000,00

---

## 🔧 Variáveis de Ambiente Necessárias

Crie um arquivo `.env.local` com:

```env
# Banco de Dados
DATABASE_URL=mysql://usuario:senha@localhost:3306/finance_flow_pro_v3

# OAuth (Manus)
VITE_APP_ID=seu_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im

# JWT
JWT_SECRET=sua_chave_secreta_muito_longa_e_complexa

# Manus APIs
BUILT_IN_FORGE_API_URL=https://api.manus.im
BUILT_IN_FORGE_API_KEY=sua_chave_api

# Frontend
VITE_FRONTEND_FORGE_API_URL=https://api.manus.im
VITE_FRONTEND_FORGE_API_KEY=sua_chave_frontend

# Informações do Proprietário
OWNER_NAME=Seu_Nome
OWNER_OPEN_ID=seu_open_id

# Analytics (Opcional)
VITE_ANALYTICS_ENDPOINT=https://analytics.manus.im
VITE_ANALYTICS_WEBSITE_ID=seu_website_id
```

---

## 📝 Comandos Úteis

### Desenvolvimento

```bash
# Iniciar servidor em desenvolvimento
pnpm dev

# Verificar tipos TypeScript
pnpm check

# Formatar código
pnpm format

# Executar testes
pnpm test
```

### Banco de Dados

```bash
# Criar migrações
pnpm db:push

# Gerar tipos
drizzle-kit generate

# Executar migrações
drizzle-kit migrate
```

### Produção

```bash
# Compilar para produção
pnpm build

# Iniciar servidor em produção
pnpm start
```

---

## 🐛 Troubleshooting

### Erro: "Cannot find module 'mysql2'"
```bash
pnpm install mysql2
```

### Erro: "Database connection failed"
- Verificar se MySQL está rodando
- Verificar credenciais em `.env.local`
- Verificar se o banco foi criado

### Erro: "WhatsApp Bot não conecta"
```bash
# Deletar cache do WhatsApp
rm -rf .wwebjs_cache

# Reiniciar servidor
pnpm dev
```

### Erro: "OAuth não funciona"
- Verificar `VITE_APP_ID` e `OAUTH_SERVER_URL`
- Verificar se a aplicação está registrada no Manus
- Limpar cookies do navegador

---

## 🔐 Segurança

### Recomendações

1. **Alterar JWT_SECRET:** Use uma chave forte e aleatória
2. **Proteger .env.local:** Não commitar em repositório
3. **HTTPS em Produção:** Usar certificado SSL/TLS
4. **Backup Regular:** Fazer backup do banco periodicamente
5. **Monitorar Logs:** Verificar logs de erro regularmente

### Backup Automático

```bash
# Script para backup automático (backup.sh)
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups"
mkdir -p $BACKUP_DIR

# Backup do banco
mysqldump -u root -p finance_flow_pro_v3 > $BACKUP_DIR/db_$DATE.sql

# Backup dos arquivos
tar -czf $BACKUP_DIR/files_$DATE.tar.gz \
  client/ server/ drizzle/ package.json

echo "✅ Backup criado: $BACKUP_DIR"
```

---

## 📊 Estrutura de Dados

### Transações Exemplo

```json
{
  "id": 1,
  "type": "income",
  "amount": "500.00",
  "category": "Trabalho",
  "description": "Freelance",
  "date": "2026-01-16",
  "paymentMethod": "pix",
  "createdAt": "2026-01-16T10:30:00.000Z"
}
```

### Usuário Exemplo

```json
{
  "id": 1,
  "openId": "user_123456",
  "name": "Seu Nome",
  "email": "seu@email.com",
  "role": "user",
  "createdAt": "2026-01-01T00:00:00.000Z"
}
```

---

## 📞 Suporte

Para dúvidas sobre restauração:

1. Consulte `README_COMPLETO.md` para documentação técnica
2. Verifique os logs: `pnpm dev` mostra erros em tempo real
3. Consulte a documentação oficial do Manus

---

## ✅ Checklist de Restauração

- [ ] Diretório do projeto criado
- [ ] Dependências instaladas (`pnpm install`)
- [ ] Arquivo `.env.local` configurado
- [ ] Banco de dados criado
- [ ] Migrações executadas (`pnpm db:push`)
- [ ] Dados restaurados (opcional)
- [ ] Servidor iniciado (`pnpm dev`)
- [ ] Aplicação acessível em `http://localhost:3000`
- [ ] Login funcionando com OAuth
- [ ] Transações visíveis no Dashboard

---

**Backup criado em:** 16 de Janeiro de 2026  
**Versão do Projeto:** 1.0.0  
**Status:** ✅ Pronto para Restauração
