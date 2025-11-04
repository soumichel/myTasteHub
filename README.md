# myTasteHub 🍽️📊

> Analytics inteligente para restaurantes - Transforme dados em decisões

## 📑 Índice

- [Visão Geral](#-visão-geral)
- [Stack Tecnológica](#-stack-tecnológica)
- [Arquitetura](#-arquitetura)
- [Instalação e Setup](#-instalação-e-setup)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Features Implementadas](#-features-implementadas)
- [Performance e Otimização](#-performance-e-otimização)
- [Desenvolvimento](#-desenvolvimento)
- [Solução de Problemas](#-solução-de-problemas)

---

## 🎯 Visão Geral

myTasteHub é uma plataforma de analytics especializada para donos de restaurantes que precisam extrair insights de seus dados operacionais sem complexidade técnica.

### Problemas que Resolve

Restaurantes geram dados massivos através de múltiplos canais (presencial, iFood, Rappi, WhatsApp, app próprio), mas donos não conseguem:
- ❌ Responder perguntas específicas do negócio rapidamente
- ❌ Comparar performance entre canais e períodos
- ❌ Identificar tendências e padrões de comportamento
- ❌ Tomar decisões baseadas em dados sem time técnico

### Solução

✅ **Dashboards intuitivos** - Métricas específicas do food service  
✅ **Comparações inteligentes** - Lojas, canais, produtos e períodos  
✅ **Análises por canal** - Performance detalhada por horário  
✅ **Interface simples** - Uso sem treinamento técnico  
✅ **Queries otimizadas** - Respostas em <500ms para análises complexas

---

## 🚀 Tecnologias Utilizadas

### **Backend**
- **[Node.js 20+](https://nodejs.org/)** - Runtime JavaScript
- **[Express 4.x](https://expressjs.com/)** - Framework web minimalista
- **[TypeScript 5.x](https://www.typescriptlang.org/)** - Type safety e melhor DX
- **[Knex.js 3.x](https://knexjs.org/)** - Query builder e migrations

### **Frontend**
- **[Angular 17.3](https://angular.io/)** - Framework SPA (Standalone Components)
- **[TypeScript 5.x](https://www.typescriptlang.org/)** - Linguagem de programação
- **[Bootstrap 5.3](https://getbootstrap.com/)** - Framework CSS responsivo
- **[Chart.js 4.x](https://www.chartjs.org/)** - Gráficos e visualizações interativas
- **[RxJS 7.x](https://rxjs.dev/)** - Programação reativa
- **[SCSS](https://sass-lang.com/)** - Pré-processador CSS

### **Database**
- **[PostgreSQL 16+](https://www.postgresql.org/)** com:
  - 10 tabelas relacionais
  - 4 materialized views para analytics
  - 20+ índices estratégicos
  - Particionamento preparado

---

## 🏗️ Arquitetura

### Backend (3-Layer Architecture)

```
┌─────────────────────────────────────────────┐
│         HTTP Layer (Express)                │
│  Routes → Middlewares → Error Handlers      │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│       Data Access Layer                     │
│  Repositories (Knex.js Query Builder)       │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│            PostgreSQL 16+                   │
│  Tables + Materialized Views + Indexes      │
└─────────────────────────────────────────────┘
```

### Frontend (Feature-Based Architecture)

```
App Shell (Navbar + Sidebar + Router Outlet)
         ↓
┌────────────────────────────────────┐
│  Feature Modules (Lazy Loaded)     │
│  • Dashboard (KPI Overview)        │
│  • Analytics (Comparações)         │
│  • Insights (Produtos por Canal)   │
└────────────────────────────────────┘
         ↓
┌────────────────────────────────────┐
│  Core Services                     │
│  • AnalyticsService (HTTP Client)  │
│  • Filters & Transformations       │
└────────────────────────────────────┘
```

### Modelo de Dados

```
stores (lojas)
  ↓
sales (vendas)
  ├→ product_sales (itens)
  │   └→ item_product_sales (customizações)
  ├→ payments (pagamentos)
  └→ delivery_sales (entregas)
       └→ delivery_addresses (endereços)

products (cardápio)
  ├→ product_options (adicionais)
  └→ product_sales

customers (clientes)
  └→ sales
```

**Materialized Views:**
- `daily_sales_summary` - Agregação diária por loja/canal
- `product_performance` - Performance de produtos
- `customer_behavior` - Métricas de clientes
- `hourly_performance` - Performance por hora do dia

---

## 🛠️ Instalação e Setup

### Pré-requisitos

```bash
Node.js 20+
PostgreSQL 16+
npm 10+
```

### 1. Clone o Repositório

```bash
git clone https://github.com/soumichel/myTasteHub.git
cd myTasteHub
```

### 2. Setup do Backend

```bash
cd backend
npm install

# Configure o banco de dados PostgreSQL
# Instruções para configurar a conexão:
# https://github.com/lucasvieira94/nola-god-level/blob/main/QUICKSTART.md

# Crie um banco chamado 'challenge_db'
psql -U postgres
CREATE DATABASE challenge_db;
\q

# Configure as variáveis de ambiente
cp .env.example .env
# Edite .env com as credenciais do PostgreSQL

# Execute as migrations
npm run migrate

# Gere dados de teste (500k vendas, 50 lojas, 6 meses)
npm run seed

# Inicie o servidor
npm run dev
```

O backend estará rodando em `http://localhost:3000`

### 3. Setup do Frontend

```bash
# Em outro terminal
cd frontend
npm install

# Inicie o servidor de desenvolvimento
npm start
```

O frontend estará disponível em `http://localhost:4200`

### 4. Teste a Aplicação

Acesse `http://localhost:4200` e você verá:
- Dashboard com KPIs
- Comparação de lojas
- Análise de produtos por canal

---

## 📁 Estrutura do Projeto

```
myTasteHub/
├── backend/
│   ├── src/
│   │   ├── app.ts                   # Configuração Express
│   │   ├── server.ts                # Entry point
│   │   ├── config/                  # Configurações
│   │   ├── database/
│   │   │   ├── index.ts             # Conexão Knex
│   │   │   ├── migrations/          # Schema do banco (2 migrations)
│   │   │   └── seeds/               # Dados de teste (500k vendas)
│   │   ├── models/                  # Tipos TypeScript
│   │   ├── repositories/
│   │   │   └── analytics.repository.ts  # Queries otimizadas
│   │   ├── routes/
│   │   │   ├── analytics.routes.ts  # 7 endpoints de analytics
│   │   │   ├── dashboard.routes.ts
│   │   │   └── sales.routes.ts
│   │   └── middlewares/
│   │       ├── error-handler.ts
│   │       └── not-found-handler.ts
│   ├── package.json
│   └── tsconfig.json
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── core/
    │   │   │   ├── components/      # Navbar, Sidebar
    │   │   │   └── services/        # AnalyticsService
    │   │   ├── shared/
    │   │   │   └── components/      # AnalyticsFilters
    │   │   ├── features/
    │   │   │   ├── dashboard/       # KPI Dashboard
    │   │   │   ├── analytics/       # Store Comparison
    │   │   │   └── insights/        # Products by Channel
    │   │   ├── app.component.ts     # Shell
    │   │   └── app.routes.ts        # Rotas
    │   ├── styles.scss              # Design System
    │   └── environments/
    ├── angular.json
    └── package.json
```

---

## ✨ Features Implementadas

### 1. Dashboard Principal (KPI Dashboard)
✅ **Métricas em tempo real:**
- Faturamento total
- Total de pedidos
- Ticket médio
- Canal com melhor performance
- Taxa de sucesso
- Pedidos cancelados

✅ **Top 10 Produtos** mais vendidos com quantidades e faturamento

✅ **Filtros de período:** Últimos 30 dias (alinhado com dados seed)

### 2. Comparação de Lojas (Store Comparison)
✅ **Seleção de 2 lojas** para comparação lado a lado

✅ **Métricas comparadas:**
- Faturamento total
- Total de pedidos
- Ticket médio
- Taxa de sucesso

✅ **Indicadores visuais** de qual loja está vencendo em cada métrica

✅ **Insights automáticos** mostrando diferenças percentuais

### 3. Análise de Produtos por Canal
✅ **6 canais disponíveis:**
- Vendas na Loja (in_store)
- iFood
- Rappi
- WhatsApp
- App Próprio
- Telefone

✅ **Estatísticas por canal:**
- Total de pedidos
- Faturamento total
- Horário de pico

✅ **Top produtos** do canal selecionado

✅ **Gráfico de performance por horário** (0h-23h)
- Dual-axis: Pedidos + Faturamento
- Identifica picos de demanda

### 4. Componentes Comuns
✅ **Filtros de Analytics:**
- Seleção de período (data inicial/final)
- Quick filters: Hoje, 7 dias, 30 dias, 90 dias
- Filtro por lojas (múltipla seleção)
- Filtro por canais (múltipla seleção)
- Auto-apply ao alterar filtros

✅ **Navegação:**
- Navbar fixa com logo SVG
- Sidebar com ícones e menu expansível
- Rotas: Dashboard, Analytics, Insights

---

## ⚡ Performance e Otimização

### Database Level

**Índices Estratégicos:**
```sql
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_store_channel ON sales(store_id, channel);
CREATE INDEX idx_product_sales_sale ON product_sales(sale_id);
-- + 17 outros índices
```

**Materialized Views (Pré-calculadas):**
- Atualização manual: `REFRESH MATERIALIZED VIEW daily_sales_summary;`

**Connection Pooling:**
```typescript
pool: {
  min: 2,
  max: 10
}
```

### Application Level

**Repository Pattern:**
- Queries centralizadas e otimizadas
- Uso de `groupByRaw()` para agregações complexas
- `COALESCE()` para tratamento de NULL
- `whereNotNull()` para filtros seguros

**Query Examples:**
```typescript
// Performance por horário com GROUP BY otimizado
.groupByRaw("EXTRACT(HOUR FROM sale_date)::int, channel")
.orderByRaw("EXTRACT(HOUR FROM sale_date)::int ASC")
```

### Frontend Level

**Lazy Loading:**
- Componentes standalone (Angular 17)
- Carregamento sob demanda

**RxJS Observables:**
- Cancelamento automático de requisições
- Evita memory leaks

**Chart.js:**
- Canvas rendering (melhor performance que SVG)
- Retry logic para garantir renderização

---

## 🔧 Solução de Problemas

### Backend não conecta no PostgreSQL

**Problema:** `Error: connect ECONNREFUSED`

**Solução:**
```bash
# Verifique se o PostgreSQL está rodando
# Windows:
Get-Service -Name postgresql*
Start-Service postgresql-x64-16

# Linux/Mac:
sudo systemctl status postgresql
sudo systemctl start postgresql
```

### Migrations falham

**Problema:** `Migration table already exists`

**Solução:**
```bash
# Rollback e execute novamente
npm run migrate:rollback
npm run migrate
```

### Frontend não carrega dados

**Problema:** Dashboard mostra valores zerados

**Verificações:**
1. Backend rodando? `http://localhost:3000/health`
2. CORS correto no `.env`? `CORS_ORIGIN=http://localhost:4200`
3. Console do navegador mostra erros?

### Seed demora muito

**Normal:** Gerar 500k vendas pode levar 2-5 minutos

**Acelerar:** Reduza o número de vendas em `backend/src/database/seeds/generate-sales.ts`:
```typescript
const SALES_COUNT = 100000; // Era 500000
```

### TypeScript erros de importação duplicada

**Problema:** `Identifier 'express' duplicado`

**Solução:** Remova imports duplicados no arquivo, mantendo apenas um conjunto no topo.

---

## 📊 Dados de Seed

O seed gera automaticamente:
- **500.000 vendas** (últimos 6 meses: maio-novembro 2025)
- **50 lojas** (São Paulo, Rio, Belo Horizonte)
- **10.000 clientes**
- **200 produtos** (10 categorias)
- **6 canais** de venda
- **Distribuição realista** de horários e padrões

---

## 📄 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

                               Projeto desenvolvido por Michel Alexandrino de Souza