# 💰 The One Dollar Gold

A full-stack personal finance tracking web app with AI-powered monthly insights. Track your income, expenses, subscriptions, assets and liabilities — and get a brutally honest GPT-powered financial health report every month.

---

## What It Does

- **Transaction tracking** — log income and expenses with categories
- **Subscription management** — recurring subscriptions auto-deduct as transactions on their due date
- **Assets & liabilities** — track what you own and what you owe (disclosures)
- **AI financial reports** — monthly GPT-4.1 Nano analysis of your finances, scoring overall health, flagging red flags, and suggesting improvements
- **Scheduled automation** — subscriptions processed daily, reports generated on the 1st of every month via cron

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite |
| UI | shadcn/ui + Tailwind CSS v4 |
| Charts | Recharts |
| Forms | React Hook Form + Zod |
| Backend | Express + TypeScript (tsx) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| AI | OpenAI GPT-4.1 Nano |
| Scheduling | node-cron |
| Routing | React Router v7 |

---

## Prerequisites

- Node.js v18+
- A [Supabase](https://supabase.com) project
- An [OpenAI](https://platform.openai.com) API key

---

## Installation

### 1. Clone the repo

```bash
git clone https://github.com/vijay1996/theonedollargold.git
cd theonedollargold
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Supabase — client (browser)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Supabase — server
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

> **Note:** `SUPABASE_SERVICE_ROLE_KEY` is used server-side only to write AI reports and process subscriptions. Never expose it to the browser.

### 4. Set up Supabase

See [`SUPABASE_SETUP.md`](./SUPABASE_SETUP.md) for the full schema and RLS policy setup.

### 5. Run the app

```bash
npm run dev
```

The Express server starts on `http://localhost:3000` and serves both the API and the React frontend via Vite middleware.

---

## Project Structure

```
theonedollargold/
├── src/                        # React frontend
│   ├── components/             # UI components
│   ├── pages/                  # Route pages
│   └── lib/
│       ├── supabase.ts         # Supabase client + auth wrapper
│       └── utils.ts
├── server/
│   ├── openAi.ts               # AI report generation pipeline
│   └── crons.ts                # Cron job definitions
├── server.ts                   # Express entry point
├── reports/                    # Generated AI reports (JSON, gitignored)
├── supabase/                   # Supabase migration files
├── components/ui/              # shadcn/ui components
├── .env.example                # Environment variable template
├── SUPABASE_SETUP.md           # Database setup guide
├── vite.config.ts
└── tsconfig.json
```

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (Express + Vite HMR) on port 3000 |
| `npm run build` | Build frontend (Vite) + bundle server (esbuild) |
| `npm start` | Run production build |
| `npm run lint` | TypeScript type check |

---

## Scheduled Jobs

Two cron jobs run automatically when the server is up:

| Job | Schedule | What it does |
|---|---|---|
| Subscription deductions | Daily | Creates expense transactions for subscriptions due today |
| AI financial reports | 1st of every month at midnight | Generates GPT report for every user, saves to `ai_insight` table |

Reports are also saved locally under `reports/reports-YYYY-MM-DD.json`.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| POST | `/api/process-subscription-deductions` | Manually trigger subscription processing |

---

## Environment Variables Reference

| Variable | Used by | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Browser | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Browser | Public anon key |
| `SUPABASE_URL` | Server | Supabase project URL |
| `SUPABASE_ANON_KEY` | Server | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Bypasses RLS for admin writes |
| `OPENAI_API_KEY` | Server | GPT-4.1 Nano API access |

---

## License

MIT