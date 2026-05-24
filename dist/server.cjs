var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_dotenv2 = __toESM(require("dotenv"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_supabase_js2 = require("@supabase/supabase-js");

// server/crons.ts
var import_node_cron = __toESM(require("node-cron"), 1);

// server/openAi.ts
var import_openai = __toESM(require("openai"), 1);
var import_supabase_js = require("@supabase/supabase-js");
var import_dotenv = __toESM(require("dotenv"), 1);
var import_ws = __toESM(require("ws"), 1);
import_dotenv.default.config({ path: ".env.local" });
function getSupabaseClient() {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_KEY || "";
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY environment variables");
  }
  return (0, import_supabase_js.createClient)(url, key, { realtime: { transport: import_ws.default } });
}
var openai = new import_openai.default({
  apiKey: process.env.OPENAI_API_KEY
});
var content = `
    You are a sharp, honest personal finance advisor. 
    You give direct, actionable advice based on the user's actual financial data.
    You flag red flags clearly, suggest improvements, and prioritize the most impactful changes.
    Be concise. No fluff. Talk like a trusted friend who knows finance \u2014 not a corporate report.
    Return ONLY a valid JSON object, no markdown, no explanation.
    Strictly do not show calculations or any calculated value in detail.
    
    Return JSON with this shape:
    {
        "redFlags": [{ "title": string, "detail": string, "severity": "high" | "medium" | "low" }],
        "suggestions": [{ "title": string, "detail": string, "impact": "high" | "medium" | "low" }],
        "positives": [{ "title": string, "detail": string }],
        "overallHealthScore": number, // 0-100
        "summary": string // 2-3 sentences, brutally honest overall assessment
    }

    Here are my transactions, assets and liabilities -

`;
async function getReport() {
  const supabase = getSupabaseClient();
  const users = await getUsers(supabase);
  if (!users?.length) return console.log("No users found");
  for (const uid of users) {
    const [transactions, assetsAndLiabilities] = await Promise.all([
      getTransactions(uid, supabase),
      getAssetsAndLiabilities(uid, supabase)
    ]);
    const data = { transactions, assetsAndLiabilities };
    const response = await openai.chat.completions.create({
      model: "gpt-4.1-nano",
      messages: [{ role: "system", content: content + JSON.stringify(data) }]
    });
    const raw = response.choices[0].message.content || "{}";
    const { redFlags, suggestions, positives, overallHealthScore, summary } = safeParseReport(raw);
    const { v4: uuidv4 } = await import("uuid");
    const reportId = uuidv4();
    supabase.from("ai_insight").upsert({
      id: reportId,
      uid,
      red_flags: JSON.stringify(redFlags),
      suggestions: JSON.stringify(suggestions),
      positives: JSON.stringify(positives),
      overall_health_score: overallHealthScore,
      summary,
      generatedat: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
    }).then(({ data: data2, error }) => {
      if (error) {
        console.error("Supabase error:", error);
        return;
      }
      console.log(`\u2713 Report written for user ${uid}`);
    });
  }
}
async function getTransactions(userId, supabase) {
  const { data, error } = await supabase.from("transactions").select("*, categories(name)").eq("uid", userId);
  if (error) console.error("Supabase error:", error);
  const formattedData = {};
  data?.filter((transaction) => {
    const [year, month, date] = transaction.date.split("-");
    const today = /* @__PURE__ */ new Date();
    return month === String(today.getMonth() + 1) && year === String(today.getFullYear());
  }).forEach((transaction) => {
    if (!formattedData[transaction.categories?.name]) {
      formattedData[transaction.categories?.name] = transaction.amount || 0;
    } else {
      formattedData[transaction.categories?.name] += transaction.amount;
    }
  });
  return data;
}
async function getAssetsAndLiabilities(userId, supabase) {
  const { data, error } = await supabase.from("disclosures").select("*").eq("uid", userId);
  if (error) console.error("Supabase error:", error);
  const formattedData = [];
  data?.forEach((disclosure) => {
    if (disclosure.type === "asset") {
      formattedData.push({
        name: disclosure.name,
        type: disclosure.type,
        category: disclosure.category,
        amount: disclosure.amount,
        currentValue: disclosure.current_value
      });
    } else {
      formattedData.push({
        name: disclosure.name,
        type: disclosure.type,
        category: disclosure.category,
        amount: disclosure.amount
      });
    }
  });
  return formattedData;
}
async function getUsers(supabase) {
  const { data, error } = await supabase.from("users").select("*");
  if (error) console.error("Supabase error:", error);
  return data?.map((user) => user.uid);
}
function safeParseReport(raw) {
  console.log(raw);
  const cleaned = raw.replace(/^```json\n?/, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("Failed to parse AI response: " + cleaned);
  }
}

// server/crons.ts
function crons() {
  console.log("Starting crons...");
  import_node_cron.default.schedule("0 0 2 * *", () => {
    console.log("Runs on 2nd midnight every month...");
    getReport().catch((err) => console.error("getReport cron error:", err));
  });
  console.log("Crons started.");
}

// server.ts
var import_ws2 = __toESM(require("ws"), 1);
var envPath = import_fs.default.existsSync(".env.local") ? ".env.local" : import_fs.default.existsSync(".env") ? ".env" : void 0;
import_dotenv2.default.config(envPath ? { path: envPath } : void 0);
console.log("ENV CHECK:", {
  PORT: process.env.PORT,
  SUPABASE_URL: process.env.SUPABASE_URL ? "\u2713 set" : "\u2717 missing",
  VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ? "\u2713 set" : "\u2717 missing",
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? "\u2713 set" : "\u2717 missing",
  NODE_ENV: process.env.NODE_ENV
});
var _supabaseAdmin = null;
function getSupabaseAdmin() {
  if (_supabaseAdmin) return _supabaseAdmin;
  const SUPABASE_URL = process.env.SUPABASE_URL || "";
  const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in server environment");
  }
  _supabaseAdmin = (0, import_supabase_js2.createClient)(SUPABASE_URL, SUPABASE_SERVICE_KEY, { realtime: { transport: import_ws2.default } });
  return _supabaseAdmin;
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = Number(process.env.PORT) || 3e3;
  app.use(import_express.default.json({ limit: "50mb" }));
  app.use(import_express.default.urlencoded({ limit: "50mb", extended: true }));
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });
  app.post("/api/process-subscription-deductions", async (req, res) => {
    const { v4: uuidv4 } = await import("uuid");
    try {
      let supabaseAdmin;
      try {
        supabaseAdmin = getSupabaseAdmin();
      } catch (e) {
        return res.status(400).json({ error: e.message });
      }
      const now = /* @__PURE__ */ new Date();
      const day = now.getDate();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      const monthStr = String(month).padStart(2, "0");
      const startOfMonth = `${year}-${monthStr}-01`;
      const endOfMonth = new Date(year, month, 0).toISOString().slice(0, 10);
      const { data: subs, error: subErr } = await supabaseAdmin.from("subscriptions").select("*");
      if (subErr) throw subErr;
      let created = 0;
      for (const s of subs || []) {
        const sDay = Number(s.deduction_date || s.deductionDate || 0);
        const sMonth = s.deduction_month || s.deductionMonth || null;
        const freq = s.frequency || "monthly";
        let dueToday = false;
        if (freq === "monthly" && sDay === day) dueToday = true;
        if (freq === "yearly" && sDay === day && Number(sMonth) === month) dueToday = true;
        if (!dueToday) continue;
        const { data: existing, error: exErr } = await supabaseAdmin.from("transactions").select("id").eq("subscription_id", s.id).gte("date", startOfMonth).lte("date", endOfMonth).limit(1);
        if (exErr) {
          console.warn("check existing tx error", exErr);
        }
        if (existing && existing.length > 0) continue;
        const tx = {
          id: uuidv4(),
          uid: s.uid,
          date: now.toISOString().slice(0, 10),
          category_id: s.category_id || s.categoryId || null,
          amount: s.amount,
          type: "expense",
          comment: `Subscription: ${s.name}`,
          subscription_id: s.id,
          created_at: Date.now(),
          updated_at: Date.now()
        };
        const { error: insErr } = await supabaseAdmin.from("transactions").insert([tx]);
        if (insErr) {
          console.warn("failed inserting tx for subscription", s.id, insErr);
        } else {
          created++;
        }
      }
      res.json({ created });
    } catch (err) {
      console.error("Process subscriptions error", err);
      res.status(500).json({ error: String(err) });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  try {
    crons();
  } catch (err) {
    console.error("Failed to start cron jobs:", err);
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port " + PORT);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
