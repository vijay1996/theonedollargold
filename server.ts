import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import fs from 'fs';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import crons from "./server/crons";
import getReport from "./server/openAi";
import ws from "ws";


// Prefer .env.local when present (common for local overrides), otherwise fall back to .env
const envPath = fs.existsSync('.env.local') ? '.env.local' : (fs.existsSync('.env') ? '.env' : undefined);
dotenv.config(envPath ? { path: envPath } : undefined);

let _supabaseAdmin: any | null = null;
function getSupabaseAdmin() {
  if (_supabaseAdmin) return _supabaseAdmin;
  const SUPABASE_URL = process.env.SUPABASE_URL || '';
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in server environment');
  }
  _supabaseAdmin = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { realtime: { transport: ws as any } });
  return _supabaseAdmin;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Allow larger JSON payloads and form bodies to support file uploads metadata
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });


  // Process subscription deductions for today: create transactions for subscriptions due today
  app.post('/api/process-subscription-deductions', async (req, res) => {
    const { v4: uuidv4 } = await import('uuid')
    try {
      let supabaseAdmin: any;
      try { supabaseAdmin = getSupabaseAdmin(); } catch (e: any) { return res.status(400).json({ error: e.message }); }

      const now = new Date();
      const day = now.getDate();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const monthStr = String(month).padStart(2, '0');
      const startOfMonth = `${year}-${monthStr}-01`;
      const endOfMonth = new Date(year, month, 0).toISOString().slice(0,10);

      // Find subscriptions due today (monthly) or yearly with matching month/day
      const { data: subs, error: subErr } = await supabaseAdmin.from('subscriptions').select('*');
      if (subErr) throw subErr;
      let created = 0;
      for (const s of subs || []) {
        const sDay = Number(s.deduction_date || s.deductionDate || 0);
        const sMonth = s.deduction_month || s.deductionMonth || null;
        const freq = s.frequency || 'monthly';
        let dueToday = false;
        if (freq === 'monthly' && sDay === day) dueToday = true;
        if (freq === 'yearly' && sDay === day && Number(sMonth) === month) dueToday = true;
        if (!dueToday) continue;

        // Check if transaction for this subscription exists in current month
        const { data: existing, error: exErr } = await supabaseAdmin.from('transactions').select('id').eq('subscription_id', s.id).gte('date', startOfMonth).lte('date', endOfMonth).limit(1);
        if (exErr) { console.warn('check existing tx error', exErr); }
        if (existing && existing.length > 0) continue; // already created

        const tx = {
          id: uuidv4(),
          uid: s.uid,
          date: now.toISOString().slice(0,10),
          category_id: s.category_id || s.categoryId || null,
          amount: s.amount,
          type: 'expense',
          comment: `Subscription: ${s.name}`,
          subscription_id: s.id,
          created_at: Date.now(),
          updated_at: Date.now()
        };
        const { error: insErr } = await supabaseAdmin.from('transactions').insert([tx]);
        if (insErr) {
          console.warn('failed inserting tx for subscription', s.id, insErr);
        } else {
          created++;
        }
      }
      res.json({ created });
    } catch (err: any) {
      console.error('Process subscriptions error', err);
      res.status(500).json({ error: String(err) });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  crons();

  app.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port " + PORT);
  });
}

startServer();
