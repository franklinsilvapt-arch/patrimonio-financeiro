# Património Financeiro

Ferramenta open-source para agregar e visualizar todo o teu património financeiro num só lugar.

## Funcionalidades

- **Importação multi-corretora** — DEGIRO, Interactive Brokers, Trading 212, Lightyear e outras, via CSV ou screenshot (OCR)
- **Dashboard completo** — valor total, alocação por corretora, exposição por país/setor/moeda e correlação entre ativos
- **Rentabilidade** — TTWROR, retorno anualizado, YTD, mensal, trimestral e máximo drawdown
- **Evolução do património** — gráficos em valor absoluto (€) e percentual (%), com filtros por período
- **Contas pessoais e empresariais** — separação e toggle entre pessoal/empresarial
- **Conversão cambial** — posições em USD convertidas automaticamente para EUR (taxas BCE)
- **Enriquecimento de ETFs** — dados de país, setor e fatores via JustETF

## Stack

Next.js 15 · React 19 · PostgreSQL · Prisma · Recharts · Tailwind CSS · shadcn/ui

## Deploy rápido (Vercel + Neon)

### 1. Base de dados

1. Criar conta gratuita em [neon.tech](https://neon.tech)
2. Criar um novo projeto (região: `eu-central-1` para melhor latência na Europa)
3. Copiar a **connection string** (formato: `postgresql://user:pass@host/db?sslmode=require`)

### 2. Deploy no Vercel

1. Fork este repositório no GitHub
2. Ir a [vercel.com/new](https://vercel.com/new) e importar o fork
3. Nas **Environment Variables**, adicionar:
   - `DATABASE_URL` = connection string do Neon
   - `ANTHROPIC_API_KEY` = chave da API Anthropic *(opcional, só para importação por screenshot)*
4. Fazer deploy

### 3. Criar as tabelas

Após o primeiro deploy, correr **uma vez** localmente (com a `DATABASE_URL` do Neon no `.env`):

```bash
npm install
npx prisma db push
```

### 4. Começar a usar

1. Abrir a app no URL do Vercel
2. Ir ao separador **Importar**
3. Selecionar a corretora e fazer upload do CSV exportado
4. O dashboard atualiza automaticamente

## Setup local (desenvolvimento)

```bash
# Clonar o repositório
git clone https://github.com/<user>/patrimonio-financeiro.git
cd patrimonio-financeiro

# Instalar dependências
npm install

# Configurar base de dados
cp .env.example .env
# Editar .env com a connection string do PostgreSQL local ou Neon

# Criar tabelas
npx prisma db push

# Arrancar
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

## Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | Connection string PostgreSQL |
| `ANTHROPIC_API_KEY` | Não | Chave API Anthropic (para importação por screenshot/imagem) |

## Corretoras suportadas

| Corretora | Método de importação |
|---|---|
| DEGIRO | CSV (Portfolio export) |
| Interactive Brokers | CSV (Activity Statement) |
| Trading 212 | CSV |
| Lightyear | Screenshot (OCR) |
| Banco CTT | Screenshot (OCR) |
| Novo Banco | Screenshot (OCR) |
| Revolut | Manual / Screenshot |
| Freedom24 | Manual / Screenshot |
| eToro | Manual / Screenshot |

## Licença

MIT
