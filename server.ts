import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from 'fs';
import nodemailer from 'nodemailer';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

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
  _supabaseAdmin = createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
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

  // Send disclosure reminder emails to all users (requires SMTP env vars and SUPABASE_SERVICE_KEY)
  app.post('/api/send-disclosure-reminders', async (req, res) => {
    try {
      let supabaseAdmin: any;
      try {
        supabaseAdmin = getSupabaseAdmin();
      } catch (e: any) {
        return res.status(400).json({ error: e.message });
      }
      const { data: users, error } = await supabaseAdmin.from('users').select('uid,email').not('email', 'is', null);
      if (error) throw error;
      if (!users || users.length === 0) return res.json({ sent: 0 });

      const smtpHost = process.env.SMTP_HOST;
      const smtpPort = Number(process.env.SMTP_PORT || '0');
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const emailFrom = process.env.EMAIL_FROM || process.env.SMTP_USER;
      const appUrl = process.env.APP_URL || 'http://localhost:5173';

      if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) return res.status(400).json({ error: 'SMTP configuration missing' });

      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: {
          user: smtpUser,
          pass: smtpPass
        }
      });

      let sent = 0;
      for (const u of users) {
        try {
          const to = u.email;
          const mail = await transporter.sendMail({
            from: emailFrom,
            to,
            subject: 'Monthly disclosure reminder',
            text: `Hi — please review and update your assets & liabilities disclosures: ${appUrl}/finance/assets`,
            html: `<p>Hi — please review and update your <a href="${appUrl}/finance/assets">Assets & Liabilities</a> disclosures.</p>`
          });
          if (mail) sent++;
        } catch (e) {
          console.warn('Failed sending to', u.email, e);
        }
      }
      res.json({ sent });
    } catch (err: any) {
      console.error('Reminder error', err);
      res.status(500).json({ error: String(err) });
    }
  });

  // Process subscription deductions for today: create transactions for subscriptions due today
  app.post('/api/process-subscription-deductions', async (req, res) => {
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

  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, dataContext } = req.body;
      
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      const geminiMessages = messages.map((m: any) => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: geminiMessages,
        config: {
          systemInstruction: "You are a helpful and expert personal finance AI assistant for the user's finance dashboard app.\nHere is the user's financial data context for your reference:\n" + JSON.stringify(dataContext) + "\nProvide concise, actionable financial tips based on their data."
        }
      });

      res.json({ message: { role: 'assistant', content: response.text } });
    } catch (error) {
      console.error("Gemini Error:", error);
      res.status(500).json({ error: String(error) });
    }
  });

  // Classify uploaded transactions into existing categories using OpenAI
  app.post('/api/classify-transactions', async (req, res) => {
    try {
      const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      if (!OPENAI_KEY) return res.status(400).json({ error: 'Missing OPENAI_API_KEY' });

      const { transactions, categories } = req.body || {};
      if (!transactions || !Array.isArray(transactions)) return res.status(400).json({ error: 'transactions required' });
      if (!categories || !Array.isArray(categories)) return res.status(400).json({ error: 'categories required' });
      // Helper: truncate long descriptions to avoid huge prompts
      const truncate = (s: string, n = 300) => (s && s.length > n) ? s.slice(0, n) + '...' : (s || '');

      // Prepare category text (small)
      const categoryNames = categories.map((c: any) => `${c.name} (type=${c.type})`).join('\n');

      // Chunk transactions into batches to stay within context limits
      const BATCH_SIZE = Number(process.env.CLASSIFY_BATCH_SIZE || 50);
      const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
      const mappings: any[] = [];

      for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
        const chunk = transactions.slice(i, i + BATCH_SIZE);
        const txnList = chunk.map((t: any, j: number) => {
          const idx = i + j; // original index
          const desc = truncate(String(t.description || t.description_raw || ''), 300).replace(/\n/g, ' ');
          const amt = String(t.amount || '');
          const dt = String(t.date || '');
          return `${idx}. ${desc} — $${amt} — date: ${dt}`;
        }).join('\n');

        const system = `You are a helper that maps bank transaction descriptions to a category name from the provided list. If none of the categories match, respond with exactly the word Other. Reply ONLY with a JSON array of objects with keys: index (number) and category (string). Example: [{"index":0,"category":"Groceries"},{"index":1,"category":"Other"}]`;
        const user = `Categories:\n${categoryNames}\n\nTransactions:\n${txnList}\n\nMap each transaction index above to the best matching category name from the list above. Use 'Other' when no category matches.`;

        const payload = {
          model: OPENAI_MODEL,
          messages: [
            { role: 'system', content: system },
            { role: 'user', content: user }
          ],
          temperature: 0,
          max_tokens: 256
        };

        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_KEY}`
          },
          body: JSON.stringify(payload)
        });

        if (!resp.ok) {
          const txt = await resp.text();
          console.error('OpenAI error', txt);
          return res.status(500).json({ error: 'OpenAI request failed', detail: txt });
        }

        const data = await resp.json();
        const content = data?.choices?.[0]?.message?.content || data?.choices?.[0]?.text || '';

        // Attempt to extract JSON from the response robustly
        function extractJsonArrayFromText(txt: string) {
          if (!txt) return null;
          const start = txt.indexOf('[');
          if (start === -1) return null;

          // Try to find matching closing bracket using a stack counter
          let depth = 0;
          for (let i = start; i < txt.length; i++) {
            const ch = txt[i];
            if (ch === '[') depth++;
            else if (ch === ']') {
              depth--;
              if (depth === 0) {
                const slice = txt.slice(start, i + 1);
                try {
                  return JSON.parse(slice);
                } catch (e) {
                  break;
                }
              }
            }
          }

          // Fallback: try to extract individual JSON objects and parse them
          try {
            const objMatches = txt.match(/\{[^}]*\}/g);
            if (objMatches && objMatches.length > 0) {
              const out: any[] = [];
              for (const m of objMatches) {
                try {
                  out.push(JSON.parse(m));
                } catch (e) {
                  // ignore malformed object
                }
              }
              if (out.length > 0) return out;
            }
          } catch (e) {
            // continue to last resort
          }

          // Last resort: attempt to close the opening bracket and parse
          try {
            const maybe = txt.slice(start) + ']';
            return JSON.parse(maybe);
          } catch (e) {
            return null;
          }
        }

        const json = extractJsonArrayFromText(content);
        if (!json) {
          console.error('Failed parsing OpenAI response (raw):', content);
          return res.status(500).json({ error: 'Failed to parse OpenAI response', raw: content });
        }

        // merge json mapping entries
        for (const m of json) mappings.push(m);
      }

      return res.json({ mapping: mappings });
    } catch (err: any) {
      console.error('classify error', err);
      res.status(500).json({ error: String(err) });
    }
  });

  // Upload a file (any format). Server will attempt to extract text, parse transactions, classify them, and return a preview mapping.
  app.post('/api/upload-transactions', async (req, res) => {
    try {
      // multer is optional; dynamic import so server still runs if not installed
      let multer: any;
      try { multer = (await import('multer')).default; } catch (e) { return res.status(500).json({ error: 'Missing dependency: multer. Run `npm install multer` on the server.' }); }
      // limit file size to 50MB
      const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } });
      upload.single('file')(req as any, res as any, async (err: any) => {
        if (err) return res.status(400).json({ error: String(err) });
        const file = (req as any).file;
        if (!file) return res.status(400).json({ error: 'file is required (field name: file)' });

        const originalName = file.originalname || 'file';
        const ext = (originalName.match(/\.[^.]+$/) || [''])[0].toLowerCase();
        let text = '';

        try {
          if (ext === '.pdf') {
            try {
              const pdfParse = (await import('pdf-parse')).default;
              const r = await pdfParse(file.buffer);
              text = r.text || '';
            } catch (e) {
              return res.status(500).json({ error: 'Missing dependency: pdf-parse. Run `npm install pdf-parse`' });
            }
          } else if (ext === '.docx' || ext === '.doc') {
            try {
              const mammoth = (await import('mammoth')).default;
              const r = await mammoth.extractRawText({ buffer: file.buffer });
              text = r.value || '';
            } catch (e) {
              return res.status(500).json({ error: 'Missing dependency: mammoth. Run `npm install mammoth`' });
            }
          } else if (ext === '.json') {
            text = file.buffer.toString('utf8');
            try {
              const parsed = JSON.parse(text);
              // convert arrays/objects to a transaction-like list if possible
              if (Array.isArray(parsed)) {
                const txns = parsed.map((p: any) => ({ date: p.date || p.transaction_date, description: p.description || p.payee || p.merchant || '', amount: p.amount || p.amt || p.value || 0 }));
                // classify directly using OpenAI below
                return classifyAndRespond(txns, res);
              } else {
                text = JSON.stringify(parsed);
              }
            } catch (e) {
              // treat as raw text
            }
          } else if (ext === '.xml' || file.mimetype?.includes('xml')) {
            text = file.buffer.toString('utf8');
            try {
              const fx = await import('fast-xml-parser');
              const parsed = fx.parse(text);
              // heuristics: find arrays of items
              const arr = Object.values(parsed).flat?.() || parsed;
              // fallback to sending raw text to classifier
            } catch (e) {
              // missing parser; fall back to raw text
            }
          } else {
            // csv / txt / other text types
            text = file.buffer.toString('utf8');
          }
        } catch (e) {
          console.error('extract text error', e);
        }

        // Heuristic parse lines for date+amount patterns
        const lines = (text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const txns: any[] = [];
        const dateRe = /\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}/;
        const amountRe = /-?\$?\d{1,3}(?:[\.,]\d{3})*(?:[\.,]\d+)?/;
        for (const ln of lines) {
          const dateMatch = ln.match(dateRe);
          const amtMatch = ln.match(amountRe);
          if (dateMatch && amtMatch) {
            txns.push({ date: dateMatch[0], description: ln.replace(dateMatch[0], '').replace(amtMatch[0], '').trim(), amount: amtMatch[0].replace(/[^0-9\.-]/g, '') });
          }
        }

        // If heuristics found none, try splitting by comma (csv-like)
        if (txns.length === 0 && text.includes(',')) {
          const rows = text.split(/\r?\n/).filter(Boolean);
          const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
          for (let i = 1; i < rows.length; i++) {
            const cols = rows[i].split(',').map(c => c.trim());
            const obj: any = {};
            headers.forEach((h, idx) => obj[h] = cols[idx] || '');
            txns.push({ date: obj.date || obj.transaction_date || '', description: obj.description || obj.payee || obj.merchant || '', amount: obj.amount || obj.amt || obj.value || '' });
          }
        }

        // Send parsed txns to classify and respond
        return classifyAndRespond(txns, res);
      });
    } catch (err: any) {
      console.error('upload transactions error', err);
      res.status(500).json({ error: String(err) });
    }
  });

  async function classifyAndRespond(txns: any[], res: any) {
    try {
      const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY;
      if (!OPENAI_KEY) return res.status(400).json({ error: 'Missing OPENAI_API_KEY' });
      // fetch user categories? For upload endpoint we assume client will provide categories in a follow-up, but here we'll ask client to provide categories instead via query param - simpler: return parsed txns so client can call classify with categories.
      return res.json({ transactions: txns });
    } catch (e: any) {
      console.error('classifyAndRespond error', e);
      return res.status(500).json({ error: String(e) });
    }
  }

  // Helper: parse a buffer (from assembled chunks or single upload) into transaction-like objects
  async function parseBufferToTxns(buffer: Buffer, originalName: string, mimetype?: string) {
    const ext = (originalName.match(/\.[^.]+$/) || [''])[0].toLowerCase();
    let text = '';
    try {
      if (ext === '.pdf') {
        const pdfParse = (await import('pdf-parse')).default;
        const r = await pdfParse(buffer);
        text = r.text || '';
      } else if (ext === '.docx' || ext === '.doc') {
        const mammoth = (await import('mammoth')).default;
        const r = await mammoth.extractRawText({ buffer });
        text = r.value || '';
      } else if (ext === '.json') {
        text = buffer.toString('utf8');
        try {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) return parsed.map((p: any) => ({ date: p.date || p.transaction_date, description: p.description || p.payee || p.merchant || '', amount: p.amount || p.amt || p.value || 0 }));
        } catch (e) {}
      } else if (ext === '.xml' || (mimetype || '').includes('xml')) {
        text = buffer.toString('utf8');
        try {
          const fx = await import('fast-xml-parser');
          const parsed = fx.parse(text);
          text = JSON.stringify(parsed);
        } catch (e) {
          text = buffer.toString('utf8');
        }
      } else {
        text = buffer.toString('utf8');
      }
    } catch (e) {
      console.error('parseBufferToTxns error', e);
      text = buffer.toString('utf8');
    }

    const lines = (text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    const txns: any[] = [];
    const dateRe = /\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}|\d{1,2}\/\d{1,2}\/\d{2,4}/;
    const amountRe = /-?\$?\d{1,3}(?:[\.,]\d{3})*(?:[\.,]\d+)?/;
    for (const ln of lines) {
      const dateMatch = ln.match(dateRe);
      const amtMatch = ln.match(amountRe);
      if (dateMatch && amtMatch) {
        txns.push({ date: dateMatch[0], description: ln.replace(dateMatch[0], '').replace(amtMatch[0], '').trim(), amount: amtMatch[0].replace(/[^0-9\.-]/g, '') });
      }
    }

    if (txns.length === 0 && text.includes(',')) {
      const rows = text.split(/\r?\n/).filter(Boolean);
      const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
      for (let i = 1; i < rows.length; i++) {
        const cols = rows[i].split(',').map(c => c.trim());
        const obj: any = {};
        headers.forEach((h, idx) => obj[h] = cols[idx] || '');
        txns.push({ date: obj.date || obj.transaction_date || '', description: obj.description || obj.payee || obj.merchant || '', amount: obj.amount || obj.amt || obj.value || '' });
      }
    }

    return txns;
  }

  // Chunked upload endpoint: accepts file chunks, assembles when last chunk received, and returns parsed transactions
  app.post('/api/upload-transactions-chunk', async (req, res) => {
    try {
      let multer: any;
      try { multer = (await import('multer')).default; } catch (e) { return res.status(500).json({ error: 'Missing dependency: multer. Run `npm install multer` on the server.' }); }
      const upload = multer({ limits: { fileSize: 50 * 1024 * 1024 } });
      upload.single('file')(req as any, res as any, async (err: any) => {
        if (err) return res.status(400).json({ error: String(err) });
        const file = (req as any).file;
        if (!file) return res.status(400).json({ error: 'file is required (field name: file)' });

        const chunkIndex = Number(req.body.chunkIndex || req.query.chunkIndex || 0);
        const totalChunks = Number(req.body.totalChunks || req.query.totalChunks || 1);
        const filename = req.body.filename || req.query.filename || file.originalname || ('upload-' + Date.now());
        const tmpDir = path.join(process.cwd(), 'tmp_uploads');
        await fs.promises.mkdir(tmpDir, { recursive: true });
        const partPath = path.join(tmpDir, `${filename}.part.${chunkIndex}`);
        await fs.promises.writeFile(partPath, file.buffer);

        if (chunkIndex + 1 < totalChunks) {
          return res.json({ received: chunkIndex });
        }

        // last chunk received: assemble
        const parts: Buffer[] = [];
        for (let i = 0; i < totalChunks; i++) {
          const p = path.join(tmpDir, `${filename}.part.${i}`);
          const b = await fs.promises.readFile(p);
          parts.push(b);
        }
        const assembled = Buffer.concat(parts);
        // clean up parts
        for (let i = 0; i < totalChunks; i++) {
          const p = path.join(tmpDir, `${filename}.part.${i}`);
          try { await fs.promises.unlink(p); } catch (e) {}
        }

        const txns = await parseBufferToTxns(assembled, filename, file.mimetype);
        return res.json({ transactions: txns });
      });
    } catch (err: any) {
      console.error('upload-transactions-chunk error', err);
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

  app.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port " + PORT);
  });
}

startServer();
