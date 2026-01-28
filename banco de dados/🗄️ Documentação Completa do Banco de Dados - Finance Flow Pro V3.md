# 🗄️ Documentação Completa do Banco de Dados - Finance Flow Pro V3

**Data:** 26 de Janeiro de 2026  
**Versão:** 1.0.0  
**Status:** ✅ Ativo e Operacional

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Localização e Acesso](#localização-e-acesso)
3. [Estrutura de Tabelas](#estrutura-de-tabelas)
4. [Tabela de Transações](#tabela-de-transações)
5. [Relacionamentos](#relacionamentos)
6. [Consultas Úteis](#consultas-úteis)
7. [Backup e Restauração](#backup-e-restauração)

---

## 🎯 Visão Geral

O banco de dados do **Finance Flow Pro V3** é um sistema relacional **MySQL 8.0+** que armazena todas as informações financeiras, usuários, categorias, tags e configurações do aplicativo. O banco foi desenvolvido com **Drizzle ORM** para garantir type-safety e facilitar migrações.

### Características Principais

- **8 tabelas principais** com relacionamentos bem definidos
- **Type-safe** com TypeScript via Drizzle ORM
- **Migrations automáticas** com Drizzle Kit
- **Índices otimizados** para performance
- **Relacionamentos muitos-para-muitos** para tags

---

## 🔌 Localização e Acesso

### Variáveis de Ambiente

O banco é acessado através da variável de ambiente `DATABASE_URL`:

```env
DATABASE_URL=mysql://usuario:senha@localhost:3306/finance_flow_pro_v3
```

### Componentes

| Componente | Detalhes |
|-----------|----------|
| **Host** | localhost (ou IP do servidor) |
| **Porta** | 3306 (padrão MySQL) |
| **Banco** | finance_flow_pro_v3 |
| **Usuário** | root (ou usuário configurado) |
| **Senha** | Configurada em .env.local |

### Acesso via CLI

```bash
# Conectar ao banco
mysql -u root -p finance_flow_pro_v3

# Ver tabelas
SHOW TABLES;

# Ver estrutura de uma tabela
DESCRIBE transactions;
```

---

## 📊 Estrutura de Tabelas

### Resumo das Tabelas

| Tabela | Registros | Propósito |
|--------|-----------|----------|
| **users** | 1+ | Usuários do sistema |
| **transactions** | 33+ | Todas as transações financeiras |
| **categories** | 10+ | Categorias de transações |
| **budgets** | 5+ | Metas de orçamento |
| **tags** | 4+ | Tags personalizadas |
| **transactionTags** | N/A | Relação muitos-para-muitos |
| **userSettings** | 1+ | Configurações por usuário |
| **paymentMethods** | 6+ | Métodos de pagamento |

---

## 💰 Tabela de Transações

### Localização dos Dados de Transferência

**A tabela `transactions` armazena TODOS os dados de transferência e transações financeiras.**

### Estrutura Completa

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

### Campos Explicados

| Campo | Tipo | Descrição |
|-------|------|-----------|
| **id** | INT | Identificador único (auto-incremento) |
| **type** | ENUM | Tipo: 'income' (entrada) ou 'expense' (saída) |
| **amount** | DECIMAL(12,2) | Valor em R$ (até 9.999.999,99) |
| **category** | VARCHAR(100) | Categoria (ex: Trabalho, Alimentação) |
| **description** | TEXT | Descrição detalhada da transação |
| **date** | VARCHAR(10) | Data no formato YYYY-MM-DD |
| **paymentMethod** | VARCHAR(50) | Método de pagamento (PIX, Cartão, etc) |
| **createdAt** | TIMESTAMP | Quando foi criada |
| **updatedAt** | TIMESTAMP | Última atualização |

### Exemplos de Registros

```json
{
  "id": 1,
  "type": "income",
  "amount": "500.00",
  "category": "Trabalho",
  "description": "Freelance - Projeto Web",
  "date": "2026-01-16",
  "paymentMethod": "pix",
  "createdAt": "2026-01-16T10:30:00.000Z",
  "updatedAt": "2026-01-16T10:30:00.000Z"
}
```

```json
{
  "id": 2,
  "type": "expense",
  "amount": "45.50",
  "category": "Alimentação",
  "description": "Almoço no restaurante",
  "date": "2026-01-16",
  "paymentMethod": "cartao_credito",
  "createdAt": "2026-01-16T12:45:00.000Z",
  "updatedAt": "2026-01-16T12:45:00.000Z"
}
```

### Consultas Úteis para Transações

#### 1. Ver todas as transações ordenadas por data

```sql
SELECT * FROM transactions ORDER BY date DESC;
```

#### 2. Somar entradas e saídas

```sql
SELECT 
  type,
  COUNT(*) as quantidade,
  SUM(amount) as total
FROM transactions
GROUP BY type;
```

#### 3. Ver transações por categoria

```sql
SELECT 
  category,
  COUNT(*) as quantidade,
  SUM(amount) as total
FROM transactions
WHERE type = 'expense'
GROUP BY category
ORDER BY total DESC;
```

#### 4. Ver transações de um período

```sql
SELECT * FROM transactions
WHERE date BETWEEN '2026-01-01' AND '2026-01-31'
ORDER BY date DESC;
```

#### 5. Ver transações por método de pagamento

```sql
SELECT 
  paymentMethod,
  COUNT(*) as quantidade,
  SUM(amount) as total
FROM transactions
GROUP BY paymentMethod;
```

---

## 🔗 Relacionamentos

### Diagrama de Relacionamentos

```
users (1) ──────────────────────────── (1) userSettings
  │
  └─── (1) ──────────────────────────── (N) transactions
         │
         └─── (N) ──────────────────────────── (N) tags
                  (through transactionTags)

categories (1) ──────────────────────────── (N) transactions
paymentMethods (1) ──────────────────────────── (N) transactions
budgets (1) ──────────────────────────── (N) categories
```

### Tabelas de Suporte

#### **users** - Usuários do Sistema

```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  openId VARCHAR(64) UNIQUE NOT NULL,
  name TEXT,
  email VARCHAR(320),
  loginMethod VARCHAR(64),
  role ENUM('user', 'admin') DEFAULT 'user',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### **categories** - Categorias de Transações

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

**Categorias Padrão:**
- Trabalho
- Alimentação
- Transporte
- Saúde
- Educação
- Lazer
- Compras
- Utilidades

#### **tags** - Tags Personalizadas

```sql
CREATE TABLE tags (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL,
  color VARCHAR(7) DEFAULT '#6366f1',
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Tags Atuais:**
- urgente
- parcelado
- recorrente
- freelance

#### **transactionTags** - Relação Muitos-para-Muitos

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

#### **budgets** - Metas de Orçamento

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

#### **userSettings** - Configurações do Usuário

```sql
CREATE TABLE userSettings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT UNIQUE NOT NULL,
  globalSpendingLimit DECIMAL(12,2) DEFAULT 5000.00,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

#### **paymentMethods** - Métodos de Pagamento

```sql
CREATE TABLE paymentMethods (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(50) UNIQUE NOT NULL,
  icon VARCHAR(50),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Métodos Disponíveis:**
- PIX
- Cartão de Crédito
- Cartão de Débito
- Dinheiro
- Transferência
- Outro

---

## 🔍 Consultas Úteis

### Análises Financeiras

#### 1. Saldo Total

```sql
SELECT 
  (SELECT SUM(amount) FROM transactions WHERE type = 'income') as entradas,
  (SELECT SUM(amount) FROM transactions WHERE type = 'expense') as saidas,
  (SELECT SUM(amount) FROM transactions WHERE type = 'income') - 
  (SELECT SUM(amount) FROM transactions WHERE type = 'expense') as saldo;
```

#### 2. Gastos por Categoria (Este Mês)

```sql
SELECT 
  category,
  COUNT(*) as quantidade,
  SUM(amount) as total,
  ROUND((SUM(amount) / (SELECT SUM(amount) FROM transactions 
    WHERE type = 'expense' AND DATE_FORMAT(date, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')) * 100), 2) as percentual
FROM transactions
WHERE type = 'expense' 
  AND DATE_FORMAT(date, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
GROUP BY category
ORDER BY total DESC;
```

#### 3. Comparação Mês Anterior vs Atual

```sql
SELECT 
  DATE_FORMAT(date, '%Y-%m') as mes,
  type,
  SUM(amount) as total
FROM transactions
WHERE DATE_FORMAT(date, '%Y-%m') IN (
  DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 1 MONTH), '%Y-%m'),
  DATE_FORMAT(NOW(), '%Y-%m')
)
GROUP BY mes, type
ORDER BY mes DESC;
```

#### 4. Transações com Tags

```sql
SELECT 
  t.id,
  t.description,
  t.amount,
  t.date,
  GROUP_CONCAT(tg.name SEPARATOR ', ') as tags
FROM transactions t
LEFT JOIN transactionTags tt ON t.id = tt.transactionId
LEFT JOIN tags tg ON tt.tagId = tg.id
GROUP BY t.id
ORDER BY t.date DESC;
```

#### 5. Alertas de Orçamento

```sql
SELECT 
  b.category,
  b.limit,
  SUM(t.amount) as gasto,
  ROUND((SUM(t.amount) / b.limit * 100), 2) as percentual_usado
FROM budgets b
LEFT JOIN transactions t ON b.category = t.category 
  AND t.type = 'expense'
  AND DATE_FORMAT(t.date, '%Y-%m') = b.month
GROUP BY b.id
HAVING percentual_usado >= 80
ORDER BY percentual_usado DESC;
```

---

## 💾 Backup e Restauração

### Arquivos de Exportação Disponíveis

Três formatos foram exportados para facilitar o backup e compartilhamento:

| Arquivo | Formato | Tamanho | Uso |
|---------|---------|--------|-----|
| **DATABASE_EXPORT.json** | JSON | Pequeno | Importação em aplicações |
| **TRANSACTIONS_EXPORT.csv** | CSV | Muito pequeno | Excel, Google Sheets |
| **DATABASE_EXPORT.sql** | SQL | Pequeno | Restauração em MySQL |

### Backup Manual

```bash
# Fazer backup do banco completo
mysqldump -u root -p finance_flow_pro_v3 > backup_$(date +%Y%m%d).sql

# Fazer backup apenas de transações
mysqldump -u root -p finance_flow_pro_v3 transactions > transactions_$(date +%Y%m%d).sql
```

### Restauração

```bash
# Restaurar do arquivo SQL
mysql -u root -p finance_flow_pro_v3 < backup_20260126.sql

# Restaurar via Drizzle
pnpm db:push
```

---

## 📈 Estatísticas Atuais (26/01/2026)

### Resumo Geral

| Métrica | Valor |
|---------|-------|
| **Total de Usuários** | 1 |
| **Total de Transações** | 33+ |
| **Entradas Totais** | R$ 5.407,43 |
| **Saídas Totais** | R$ 5.034,20 |
| **Saldo Atual** | R$ 373,23 |
| **Total de Categorias** | 10 |
| **Total de Tags** | 4 |
| **Total de Metas** | 5+ |

### Distribuição de Transações

| Tipo | Quantidade | Total |
|------|-----------|-------|
| **Entradas** | 15+ | R$ 5.407,43 |
| **Saídas** | 18+ | R$ 5.034,20 |

### Métodos de Pagamento Mais Usados

| Método | Quantidade | % |
|--------|-----------|---|
| **PIX** | 18 | 54.5% |
| **Cartão de Crédito** | 8 | 24.2% |
| **Dinheiro** | 4 | 12.1% |
| **Transferência** | 3 | 9.1% |

---

## 🔐 Segurança

### Proteções Implementadas

- **Validação de Input:** Todos os dados são validados com Zod antes de inserir
- **Prepared Statements:** Drizzle ORM usa prepared statements (SQL injection prevention)
- **Tipos TypeScript:** Type-safety em tempo de compilação
- **Índices:** Otimizados para performance e integridade
- **Constraints:** Foreign keys e unique constraints

### Boas Práticas

1. **Nunca** compartilhe `DATABASE_URL` com credenciais
2. **Sempre** faça backup antes de alterações estruturais
3. **Monitore** o tamanho do banco regularmente
4. **Valide** dados antes de inserir manualmente
5. **Use** migrations para mudanças de schema

---

## 📝 Migrações

### Como Criar Migrações

```bash
# Editar schema em drizzle/schema.ts
# Depois executar:
pnpm db:push

# Isso vai:
# 1. Gerar migração automática
# 2. Executar a migração
# 3. Atualizar tipos TypeScript
```

### Ver Histórico de Migrações

```bash
# Listar migrações
ls -la drizzle/migrations/

# Ver SQL de uma migração
cat drizzle/migrations/0001_*.sql
```

---

## 🆘 Troubleshooting

### Problema: "Access denied for user"

**Solução:** Verificar credenciais em `DATABASE_URL`

```bash
# Testar conexão
mysql -u root -p -h localhost
```

### Problema: "Table doesn't exist"

**Solução:** Executar migrações

```bash
pnpm db:push
```

### Problema: "Disk space exceeded"

**Solução:** Fazer cleanup de dados antigos

```sql
-- Deletar transações com mais de 1 ano
DELETE FROM transactions 
WHERE date < DATE_SUB(NOW(), INTERVAL 1 YEAR);
```

---

## 📞 Suporte

Para dúvidas sobre o banco de dados:

1. Consulte esta documentação
2. Verifique os logs do servidor
3. Execute as consultas úteis fornecidas
4. Faça backup antes de qualquer alteração

---

**Documentação criada em:** 26 de Janeiro de 2026  
**Versão:** 1.0.0  
**Status:** ✅ Completa e Atualizada
