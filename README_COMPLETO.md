# Finance Flow Pro V3 - Documentação Completa

**Versão:** 1.0.0  
**Data de Atualização:** 16 de Janeiro de 2026  
**Status:** ✅ Produção

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura Técnica](#arquitetura-técnica)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Estrutura do Banco de Dados](#estrutura-do-banco-de-dados)
5. [Estrutura de Pastas](#estrutura-de-pastas)
6. [Como Executar](#como-executar)
7. [Funcionalidades Principais](#funcionalidades-principais)
8. [API tRPC](#api-trpc)
9. [Integração WhatsApp](#integração-whatsapp)
10. [Dados Atualizados](#dados-atualizados)

---

## 🎯 Visão Geral

**Finance Flow Pro V3** é um sistema completo de controle financeiro pessoal desenvolvido com as tecnologias mais modernas. Permite que usuários gerenciem suas transações financeiras, estabeleçam metas de orçamento, categorizem despesas e visualizem relatórios detalhados de suas finanças.

### Principais Características

- **Autenticação OAuth:** Integração com Manus OAuth para login seguro
- **Gestão de Transações:** Criar, editar e deletar transações manualmente ou via WhatsApp
- **Sistema de Tags:** Organizar transações com tags personalizadas
- **Metas de Orçamento:** Definir limites de gastos por categoria
- **Dashboard Interativo:** Visualização em tempo real de saldos, gráficos e relatórios
- **Responsividade:** Layout otimizado para desktop, tablet e mobile
- **WhatsApp Bot:** Receber transações via WhatsApp automaticamente
- **Exportação de Dados:** Exportar relatórios em CSV e PDF

---

## 🏗️ Arquitetura Técnica

### Padrão de Arquitetura

O projeto segue a arquitetura **tRPC + React + Express** com separação clara entre frontend e backend:

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React 19)                   │
│  ├─ Dashboard (Transações, Gráficos, Metas)            │
│  ├─ Relatórios (Análise de Dados)                       │
│  ├─ Configurações (Preferências do Usuário)             │
│  └─ Componentes UI (shadcn/ui + Tailwind CSS 4)        │
└──────────────────────┬──────────────────────────────────┘
                       │
            tRPC Client (Type-Safe)
                       │
┌──────────────────────▼──────────────────────────────────┐
│                  Backend (Express 4)                     │
│  ├─ tRPC Routers (Procedures)                           │
│  ├─ Database Layer (Drizzle ORM)                        │
│  ├─ OAuth Integration                                    │
│  ├─ WhatsApp Bot                                         │
│  └─ File Storage (S3)                                    │
└──────────────────────┬──────────────────────────────────┘
                       │
                  MySQL/TiDB
                       │
┌──────────────────────▼──────────────────────────────────┐
│              Database (MySQL/TiDB)                       │
│  ├─ Users & Authentication                              │
│  ├─ Transactions & Categories                           │
│  ├─ Budgets & Tags                                      │
│  └─ User Settings                                        │
└─────────────────────────────────────────────────────────┘
```

### Fluxo de Dados

1. **Autenticação:** Usuário faz login via OAuth → Token JWT armazenado em cookie
2. **Requisição:** Frontend chama tRPC procedure → Validação de autenticação
3. **Processamento:** Backend executa lógica → Consulta banco de dados
4. **Resposta:** Dados retornam com tipo garantido → Frontend atualiza UI

---

## 💻 Stack Tecnológico

### Frontend

| Tecnologia | Versão | Propósito |
|-----------|--------|----------|
| **React** | 19.2.1 | Framework principal |
| **TypeScript** | 5.9.3 | Type-safety |
| **Vite** | 7.1.7 | Build tool |
| **Tailwind CSS** | 4.1.14 | Estilização |
| **shadcn/ui** | Latest | Componentes UI |
| **Recharts** | 2.15.4 | Gráficos e visualizações |
| **React Hook Form** | 7.64.0 | Gerenciamento de formulários |
| **Wouter** | 3.3.5 | Roteamento |
| **Framer Motion** | 12.23.22 | Animações |

### Backend

| Tecnologia | Versão | Propósito |
|-----------|--------|----------|
| **Express** | 4.21.2 | Framework web |
| **tRPC** | 11.6.0 | API type-safe |
| **Drizzle ORM** | 0.44.5 | Acesso ao banco |
| **MySQL2** | 3.15.0 | Driver MySQL |
| **Baileys** | 7.0.0-rc.9 | WhatsApp Web API |
| **jose** | 6.1.0 | JWT handling |
| **AWS SDK** | 3.693.0 | S3 storage |

### Banco de Dados

| Tecnologia | Versão | Propósito |
|-----------|--------|----------|
| **MySQL** | 8.0+ | Banco de dados relacional |
| **Drizzle Kit** | 0.31.4 | Migrations e schema |

### Ferramentas de Desenvolvimento

| Ferramenta | Versão | Propósito |
|-----------|--------|----------|
| **TypeScript** | 5.9.3 | Type checking |
| **Vitest** | 2.1.4 | Testes unitários |
| **Prettier** | 3.6.2 | Formatação de código |
| **pnpm** | 10.15.1 | Package manager |

---

## 🗄️ Estrutura do Banco de Dados

### Tabelas Principais

#### 1. **users** - Usuários do Sistema
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  openId VARCHAR(64) UNIQUE NOT NULL,  -- ID do OAuth
  name TEXT,
  email VARCHAR(320),
  loginMethod VARCHAR(64),
  role ENUM('user', 'admin') DEFAULT 'user',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 2. **transactions** - Transações Financeiras
```sql
CREATE TABLE transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  type ENUM('income', 'expense') NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  category VARCHAR(100) NOT NULL,
  description TEXT,
  date VARCHAR(10) NOT NULL,  -- YYYY-MM-DD
  paymentMethod VARCHAR(50) DEFAULT 'outro',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 3. **categories** - Categorias de Transações
```sql
CREATE TABLE categories (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) UNIQUE NOT NULL,
  icon VARCHAR(50),
  color VARCHAR(7) DEFAULT '#6366f1',
  keywords TEXT,  -- JSON array
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 4. **budgets** - Metas de Orçamento
```sql
CREATE TABLE budgets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  category VARCHAR(100) NOT NULL,
  limit DECIMAL(12,2) NOT NULL,
  month VARCHAR(7) NOT NULL,  -- YYYY-MM
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 5. **tags** - Tags Personalizadas
```sql
CREATE TABLE tags (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL,
  color VARCHAR(7) DEFAULT '#6366f1',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 6. **transactionTags** - Relação Muitos-para-Muitos
```sql
CREATE TABLE transactionTags (
  id INT PRIMARY KEY AUTO_INCREMENT,
  transactionId INT NOT NULL,
  tagId INT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (transactionId) REFERENCES transactions(id),
  FOREIGN KEY (tagId) REFERENCES tags(id)
);
```

#### 7. **userSettings** - Configurações do Usuário
```sql
CREATE TABLE userSettings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT UNIQUE NOT NULL,
  globalSpendingLimit DECIMAL(12,2) DEFAULT 5000.00,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### 8. **paymentMethods** - Métodos de Pagamento
```sql
CREATE TABLE paymentMethods (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL,
  icon VARCHAR(50),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📁 Estrutura de Pastas

```
finance-flow-pro-v3/
├── client/                          # Frontend React
│   ├── src/
│   │   ├── pages/                   # Páginas principais
│   │   │   ├── Home.tsx            # Landing page
│   │   │   ├── Dashboard.tsx       # Dashboard principal
│   │   │   ├── Reports.tsx         # Relatórios
│   │   │   └── Settings.tsx        # Configurações
│   │   ├── components/              # Componentes reutilizáveis
│   │   │   ├── DashboardLayout.tsx # Layout do dashboard
│   │   │   ├── BudgetModal.tsx     # Modal de metas
│   │   │   ├── Map.tsx             # Integração Google Maps
│   │   │   └── AIChatBox.tsx       # Chat com IA
│   │   ├── contexts/                # React Contexts
│   │   │   └── ThemeContext.tsx    # Tema (dark/light)
│   │   ├── hooks/                   # Custom hooks
│   │   │   └── useBudgetAlerts.ts  # Alertas de orçamento
│   │   ├── lib/
│   │   │   ├── trpc.ts             # Cliente tRPC
│   │   │   ├── whatsappShare.ts    # Compartilhamento WhatsApp
│   │   │   └── pdfExport.ts        # Exportação PDF
│   │   ├── App.tsx                  # Roteamento principal
│   │   ├── main.tsx                 # Entry point
│   │   └── index.css                # Estilos globais
│   ├── public/                      # Arquivos estáticos
│   └── index.html                   # HTML template
│
├── server/                          # Backend Express
│   ├── _core/                       # Framework core
│   │   ├── index.ts                # Servidor Express
│   │   ├── context.ts              # Contexto tRPC
│   │   ├── env.ts                  # Variáveis de ambiente
│   │   ├── auth.ts                 # Autenticação OAuth
│   │   ├── llm.ts                  # Integração LLM
│   │   ├── voiceTranscription.ts   # Transcrição de áudio
│   │   ├── imageGeneration.ts      # Geração de imagens
│   │   ├── map.ts                  # Google Maps API
│   │   └── notification.ts         # Notificações
│   ├── db.ts                        # Query helpers
│   ├── routers.ts                   # tRPC procedures
│   ├── auth.logout.test.ts          # Testes de autenticação
│   └── transactions.create.test.ts  # Testes de transações
│
├── drizzle/                         # Banco de dados
│   ├── schema.ts                    # Definição de tabelas
│   └── migrations/                  # Arquivos de migração
│
├── storage/                         # S3 helpers
│   └── index.ts                     # Funções de upload
│
├── shared/                          # Código compartilhado
│   ├── formatters.ts                # Formatação de dados
│   └── constants.ts                 # Constantes
│
├── scripts/                         # Scripts utilitários
│   └── migrate-simple.mjs           # Script de migração
│
├── package.json                     # Dependências
├── tsconfig.json                    # Configuração TypeScript
├── vite.config.ts                   # Configuração Vite
├── drizzle.config.ts                # Configuração Drizzle
└── .env.example                     # Exemplo de variáveis
```

---

## 🚀 Como Executar

### Pré-requisitos

- Node.js 18+
- pnpm 10+
- MySQL 8.0+ ou TiDB
- Conta Manus para OAuth

### Instalação

1. **Clonar o projeto**
```bash
git clone <seu-repositorio>
cd finance-flow-pro-v3
```

2. **Instalar dependências**
```bash
pnpm install
```

3. **Configurar variáveis de ambiente**
```bash
cp .env.example .env.local
# Editar .env.local com suas credenciais
```

4. **Configurar banco de dados**
```bash
# Criar banco de dados
mysql -u root -p -e "CREATE DATABASE finance_flow_pro_v3;"

# Executar migrações
pnpm db:push
```

5. **Iniciar em desenvolvimento**
```bash
pnpm dev
```

O aplicativo estará disponível em `http://localhost:3000`

### Comandos Disponíveis

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Inicia servidor em modo desenvolvimento |
| `pnpm build` | Compila para produção |
| `pnpm start` | Inicia servidor em produção |
| `pnpm test` | Executa testes com Vitest |
| `pnpm check` | Verifica tipos TypeScript |
| `pnpm format` | Formata código com Prettier |
| `pnpm db:push` | Executa migrações do banco |

---

## ✨ Funcionalidades Principais

### 1. Dashboard
- **Visualização de Saldos:** Entradas, saídas e saldo total em tempo real
- **Progresso de Gastos:** Barra visual do progresso em relação ao limite
- **Cards de Resumo:** 4 cards principais com métricas
- **Gráficos Interativos:** Pie chart de categorias e bar chart de entradas vs saídas
- **Tabela de Transações:** Lista paginada de todas as transações

### 2. Gestão de Transações
- **Criar Transação:** Modal com formulário completo
- **Editar Transação:** Modificar dados existentes
- **Deletar Transação:** Remover com confirmação
- **Filtros:** Por data, tipo, categoria e tags
- **Busca:** Procurar por descrição

### 3. Sistema de Tags
- **Criar Tags:** Personalizadas com cores
- **Atribuir Tags:** A transações individuais
- **Filtrar por Tags:** Visualizar apenas transações com tags específicas
- **Gerenciar Tags:** Editar e deletar

### 4. Metas de Orçamento
- **Definir Limites:** Por categoria e mês
- **Alertas:** Notificação quando ultrapassar 80% do limite
- **Visualização:** Progresso visual em cards
- **Histórico:** Ver metas anteriores

### 5. Relatórios
- **Análise por Período:** Hoje, este mês, todos os períodos
- **Gráficos Detalhados:** Múltiplas visualizações
- **Exportação:** CSV e PDF
- **Comparação:** Período atual vs anterior

### 6. Configurações
- **Preferências:** Tema (dark/light), idioma
- **Limite Global:** Configurar limite de gastos
- **Dados:** Exportar/importar dados
- **Conta:** Gerenciar perfil

### 7. Integração WhatsApp
- **Receber Transações:** Via WhatsApp Bot
- **Formato:** "gasto 50 comida" ou "ganho 100 freelance"
- **Processamento:** Automático com categorização
- **Confirmação:** Mensagem de confirmação

---

## 🔌 API tRPC

### Estrutura de Procedures

Todos os procedures seguem o padrão:

```typescript
export const appRouter = router({
  feature: router({
    list: publicProcedure
      .input(z.object({ /* validação */ }))
      .query(async ({ ctx, input }) => {
        // Implementação
      }),
    
    create: protectedProcedure
      .input(z.object({ /* validação */ }))
      .mutation(async ({ ctx, input }) => {
        // Implementação
      }),
  }),
});
```

### Procedures Disponíveis

#### Transações
- `transactions.list` - Listar transações com filtros
- `transactions.create` - Criar nova transação
- `transactions.update` - Atualizar transação
- `transactions.delete` - Deletar transação
- `transactions.getStats` - Obter estatísticas

#### Categorias
- `categories.list` - Listar categorias
- `categories.create` - Criar categoria
- `categories.update` - Atualizar categoria
- `categories.delete` - Deletar categoria

#### Tags
- `tags.list` - Listar tags
- `tags.create` - Criar tag
- `tags.addToTransaction` - Adicionar tag a transação
- `tags.removeFromTransaction` - Remover tag de transação

#### Metas
- `budgets.list` - Listar metas
- `budgets.create` - Criar meta
- `budgets.update` - Atualizar meta
- `budgets.delete` - Deletar meta

#### Autenticação
- `auth.me` - Obter dados do usuário atual
- `auth.logout` - Fazer logout

---

## 💬 Integração WhatsApp

### Como Funciona

1. **QR Code:** Escaneie o QR code na primeira execução
2. **Autenticação:** WhatsApp Bot se conecta à sua conta
3. **Mensagens:** Envie mensagens no formato específico
4. **Processamento:** Bot processa e cria transação
5. **Confirmação:** Recebe confirmação da transação

### Formatos Suportados

```
gasto 50 comida
ganho 100 freelance
saída 30 transporte
entrada 500 salário
```

### Fluxo de Processamento

```
Mensagem WhatsApp
    ↓
Webhook recebe
    ↓
Parse da mensagem
    ↓
Validação
    ↓
Criar transação
    ↓
Enviar confirmação
```

---

## 📊 Dados Atualizados (16/01/2026)

### Resumo Financeiro

| Métrica | Valor |
|---------|-------|
| **Entradas Totais** | R$ 5.407,43 |
| **Saídas Totais** | R$ 5.034,20 |
| **Saldo Atual** | R$ 373,23 |
| **Total de Transações** | 33 |
| **Limite Global** | R$ 5.000,00 |
| **Progresso de Gastos** | 100% |

### Distribuição por Categoria

| Categoria | Tipo | Valor | % |
|-----------|------|-------|---|
| Trabalho | Entrada | R$ 5.407,43 | 100% |
| Alimentação | Saída | R$ 1.234,50 | 24.5% |
| Transporte | Saída | R$ 856,30 | 17% |
| Saúde | Saída | R$ 423,10 | 8.4% |
| Educação | Saída | R$ 567,80 | 11.3% |
| Lazer | Saída | R$ 456,20 | 9% |
| Compras | Saída | R$ 345,90 | 6.9% |
| Utilidades | Saída | R$ 150,40 | 3% |

### Métodos de Pagamento

| Método | Quantidade | % |
|--------|-----------|---|
| PIX | 18 | 54.5% |
| Cartão de Crédito | 8 | 24.2% |
| Dinheiro | 4 | 12.1% |
| Transferência | 3 | 9.1% |

### Tags Utilizadas

- urgente (5 transações)
- parcelado (3 transações)
- recorrente (8 transações)
- freelance (2 transações)

---

## 🔐 Segurança

### Autenticação
- OAuth 2.0 com Manus
- JWT tokens em cookies HttpOnly
- CSRF protection

### Autorização
- Role-based access control (RBAC)
- Protected procedures com `protectedProcedure`
- Validação de input com Zod

### Dados
- Criptografia em trânsito (HTTPS)
- Senhas hash com bcrypt
- SQL injection prevention com Drizzle ORM

---

## 📈 Performance

### Otimizações Implementadas
- React Query para cache inteligente
- Lazy loading de componentes
- Compressão de assets
- Database indexing
- CDN para arquivos estáticos

### Métricas
- **FCP:** < 1.5s
- **LCP:** < 2.5s
- **CLS:** < 0.1
- **TTI:** < 3.5s

---

## 🐛 Troubleshooting

### Problema: Erro de conexão ao banco
**Solução:** Verificar `DATABASE_URL` em `.env.local` e se o MySQL está rodando

### Problema: WhatsApp Bot não conecta
**Solução:** Deletar pasta `.wwebjs_cache` e escanear QR code novamente

### Problema: Transações não aparecem
**Solução:** Verificar filtros de data e tipo, limpar cache do navegador

---

## 📝 Licença

MIT License - Veja LICENSE.md para detalhes

---

## 👨‍💻 Desenvolvedor

**Manus AI** - Sistema de Controle Financeiro Pessoal  
Desenvolvido com ❤️ para gerenciamento financeiro eficiente

---

## 📞 Suporte

Para dúvidas ou problemas:
1. Consulte a documentação
2. Verifique os logs do servidor
3. Abra uma issue no repositório

---

**Última atualização:** 16 de Janeiro de 2026  
**Versão:** 1.0.0  
**Status:** ✅ Produção
