import { useEffect, useState } from "react";
import { auth, db, serverUrl } from "@/src/lib/firebase";
import { toast } from "sonner";

type Report = {
    id: string;
    uid: string;
    title: string;
    summary: string;
    overall_health_score: number;
    red_flags: string;
    suggestions: string;
    positives: string;
    created_at: number;
};

type InsightItem = {
    title: string;
    detail: string;
    severity?: "high" | "medium" | "low";
    impact?: "high" | "medium" | "low";
};

const parseField = (field: string): InsightItem[] => {
    try { return JSON.parse(field) || []; } catch { return []; }
};

const formatDate = (ts: number) =>
    new Date(ts).toLocaleDateString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });

const scoreColor = (s: number) => s >= 75 ? "#16a34a" : s >= 50 ? "#d97706" : "#dc2626";

const SEVERITY_STYLES: Record<string, { bg: string; text: string; badge: string }> = {
    high:   { bg: "#fff1f2", text: "#9f1239", badge: "#fda4af" },
    medium: { bg: "#fffbeb", text: "#92400e", badge: "#fcd34d" },
    low:    { bg: "#f0fdf4", text: "#166534", badge: "#86efac" },
};

const IMPACT_STYLES: Record<string, { bg: string; text: string; badge: string }> = {
    high:   { bg: "#f5f3ff", text: "#5b21b6", badge: "#c4b5fd" },
    medium: { bg: "#eff6ff", text: "#1e40af", badge: "#93c5fd" },
    low:    { bg: "#f0fdf4", text: "#166534", badge: "#86efac" },
};

export default function AiInsight({refresh}: { refresh: () => void }) {

    const [reportList, setReportList]     = useState<Report[]>([]);
    const [filtered, setFiltered]         =useState<Report[]>([]);
    const [currentReport, setCurrentReport] = useState<Report | null>(null);
    const [searchTerm, setSearchTerm]     = useState("");
    const [tries, setTries]               = useState<number>(0);
    const [generating, setGenerating]     = useState(false);

    const fetchRetries = async () => {
        const data = await db.from('users').select('ai_report_tries').eq('uid', auth.currentUser?.uid)
        if (data.error || data.data === null) {
            toast.error("Could not determine how many AI generations are left")
            return;
        }
        setTries(data?.data[0]['ai_report_tries'] as number);
    }

    const fetchReportList = async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;
        const data = await db.from("ai_insight").select("*").eq("uid", uid).order("created_at", { ascending: false });
        if (data.error) {
            toast.error("Could not load reports! Try again later")
                return;
        }
        setReportList(data.data as Report[]);
        await fetchRetries();
    }

    // ── generate ───────────────────────────────────────────────────────────
    const generateReport = async () => {
        setGenerating(true);
        try {
            const res  = await fetch(serverUrl + "/api/generate-ai-insight", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ uid: auth.currentUser?.uid, title: getReportTitle()  }),
            });
            const data = await res.json();
            if (!data.error) {
                toast.success("Report generated!");
                refresh();
            } else {
                toast.error(data.error || "Could not generate report.");
            }
        } catch {
            toast.error("Could not generate report.");
        } finally {
            setGenerating(false);
        }
    };

    // ── fetch ──────────────────────────────────────────────────────────────
    useEffect(() => {
        fetchReportList();
    }, []);

    useEffect(() => {
        if (searchTerm.length) {
            setFiltered(
                reportList.sort((a,b) => b.created_at - a.created_at).filter(r =>
                    r.title?.toLowerCase().includes(searchTerm.toLowerCase())
                )
            )
        } else {
            setFiltered(
                reportList.sort((a,b) => b.created_at - a.created_at)
            );
        }
    }, [searchTerm, reportList])

    // ── render ─────────────────────────────────────────────────────────────
    return (
        <>
            <style>{css}</style>
            <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=DM+Serif+Display&display=swap" rel="stylesheet" />

            <div className="ai-root">

                {/* ── header ── */}
                <div className="ai-header">
                    <div>
                        <h1 className="ai-heading">AI Insights</h1>
                        <p className="ai-subheading">AI-powered analysis of your financial health</p>
                    </div>
                    <div className="ai-header-actions">
                        <div className="ai-tries-badge">
                            <span style={{ color: tries <= 0 ? "#dc2626" : "#059669", fontWeight: 600 }}>{tries}</span>
                            &nbsp;left
                        </div>
                        <button
                            className="ai-btn-generate"
                            onClick={generateReport}
                            disabled={generating || (tries !== null && tries <= 0)}
                        >
                            {generating
                                ? <><span className="ai-spinner" /> Generating…</>
                                : "Generate Report"}
                        </button>
                    </div>
                </div>

                {/* ── body ── */}
                <div className="ai-body">

                    {/* sidebar — report list */}
                    <aside className="ai-sidebar">
                        <div className="ai-sidebar-inner">
                            <p className="ai-sidebar-label">Reports</p>
                            <input
                                className="ai-search"
                                type="text"
                                placeholder="Search…"
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                            />
                            <div className="ai-report-list">
                                {
                                    filtered.map(r => (
                                        <button
                                            key={r.id}
                                            className={`ai-report-item${currentReport?.id === r.id ? " selected" : ""}`}
                                            onClick={() => setCurrentReport(r)}
                                        >
                                            <span className="ai-report-title">{r.title}</span>
                                            <span className="ai-report-date">{formatDate(r.created_at)}</span>
                                        </button>
                                    ))
                                }
                            </div>
                        </div>
                    </aside>

                    {/* main — report detail */}
                    <main className="ai-main">
                        {!currentReport ? (
                            <div className="ai-empty-state">
                                <span className="ai-empty-icon">📊</span>
                                <p>Select a report to view insights</p>
                            </div>
                        ) : (
                            <div className="ai-detail" key={currentReport.id}>

                                {/* score card */}
                                <div className="ai-card ai-score-card">
                                    <div className="ai-score-left">
                                        <h2 className="ai-report-name">{currentReport.title}</h2>
                                        <p className="ai-report-summary">{currentReport.summary}</p>
                                    </div>
                                    <div className="ai-score-right">
                                        <div className="ai-score-number" style={{ color: scoreColor(currentReport.overall_health_score) }}>
                                            {currentReport.overall_health_score}
                                        </div>
                                        <div className="ai-score-label">Health Score</div>
                                        <div className="ai-score-bar-bg">
                                            <div className="ai-score-bar-fill" style={{
                                                width: `${currentReport.overall_health_score}%`,
                                                background: scoreColor(currentReport.overall_health_score),
                                            }} />
                                        </div>
                                    </div>
                                </div>

                                {/* red flags */}
                                {parseField(currentReport.red_flags).length > 0 && (
                                    <div className="ai-card">
                                        <h3 className="ai-section-title">⚠️ Red Flags</h3>
                                        {parseField(currentReport.red_flags).map((rf, i) => {
                                            const c = SEVERITY_STYLES[rf.severity || "low"];
                                            return <InsightCard key={i} item={rf} colors={c} badgeLabel={rf.severity} />;
                                        })}
                                    </div>
                                )}

                                {/* suggestions */}
                                {parseField(currentReport.suggestions).length > 0 && (
                                    <div className="ai-card">
                                        <h3 className="ai-section-title">💡 Suggestions</h3>
                                        {parseField(currentReport.suggestions).map((sg, i) => {
                                            const c = IMPACT_STYLES[sg.impact || "low"];
                                            return <InsightCard key={i} item={sg} colors={c} badgeLabel={sg.impact} />;
                                        })}
                                    </div>
                                )}

                                {/* positives */}
                                {parseField(currentReport.positives).length > 0 && (
                                    <div className="ai-card">
                                        <h3 className="ai-section-title">✅ Positives</h3>
                                        {parseField(currentReport.positives).map((po, i) => (
                                            <InsightCard key={i} item={po} colors={SEVERITY_STYLES.low} />
                                        ))}
                                    </div>
                                )}

                            </div>
                        )}
                    </main>

                </div>
            </div>
        </>
    );
}

function getReportTitle() {
    const date = new Date();
    return `As of ${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`
}

function InsightCard({ item, colors, badgeLabel }: {
    item: InsightItem;
    colors: { bg: string; text: string; badge: string };
    badgeLabel?: string;
}) {
    return (
        <div className="ai-insight-card" style={{ background: colors.bg }}>
            <div className="ai-insight-header">
                <span className="ai-insight-title" style={{ color: colors.text }}>{item.title}</span>
                {badgeLabel && (
                    <span className="ai-insight-badge" style={{ background: colors.badge, color: colors.text }}>
                        {badgeLabel}
                    </span>
                )}
            </div>
            <p className="ai-insight-detail" style={{ color: colors.text }}>{item.detail}</p>
        </div>
    );
}

const css = `
.ai-root {
    font-family: 'DM Sans', sans-serif;
    min-height: 100vh;
    background: #f8f7f4;
    padding: 1.5rem;
    box-sizing: border-box;
}

/* header */
.ai-header {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.5rem;
}
.ai-heading {
    font-family: 'DM Serif Display', serif;
    font-size: clamp(1.4rem, 5vw, 2rem);
    font-weight: 400;
    color: #1a1a1a;
    margin: 0;
}
.ai-subheading {
    font-size: 0.875rem;
    color: #6b7280;
    margin: 0.2rem 0 0;
}
.ai-header-actions {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
}
.ai-tries-badge {
    font-size: 0.825rem;
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 0.45rem 0.875rem;
    color: #374151;
}
.ai-btn-generate {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: #1a1a1a;
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 0.55rem 1.25rem;
    font-size: 0.875rem;
    font-weight: 500;
    font-family: inherit;
    cursor: pointer;
    transition: opacity 0.2s;
}
.ai-btn-generate:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}
.ai-spinner {
    display: inline-block;
    width: 13px;
    height: 13px;
    border: 2px solid rgba(255,255,255,0.35);
    border-top-color: #fff;
    border-radius: 50%;
    animation: ai-spin 0.65s linear infinite;
}
@keyframes ai-spin { to { transform: rotate(360deg); } }

/* body layout */
.ai-body {
    display: grid;
    grid-template-columns: 260px minmax(0, 1fr);
    gap: 1.25rem;
    align-items: start;
}

/* sidebar */
.ai-sidebar-inner {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    overflow: hidden;
    position: sticky;
    top: 1.5rem;
}
.ai-sidebar-label {
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #9ca3af;
    margin: 0;
    padding: 1rem 1rem 0.5rem;
}
.ai-search {
    display: block;
    width: 100%;
    box-sizing: border-box;
    padding: 0.5rem 0.875rem;
    margin: 0 0 0.5rem;
    border: none;
    border-top: 1px solid #f3f4f6;
    border-bottom: 1px solid #f3f4f6;
    font-size: 0.825rem;
    font-family: inherit;
    color: #374151;
    background: #f9fafb;
    outline: none;
}
.ai-report-list {
    max-height: 60vh;
    overflow-y: auto;
    padding: 0.375rem;
}
.ai-report-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.625rem 0.75rem;
    border-radius: 8px;
    background: transparent;
    border: none;
    cursor: pointer;
    font-family: inherit;
    margin-bottom: 2px;
    transition: background 0.15s;
}
.ai-report-item:hover { background: #f3f4f6; }
.ai-report-item.selected { background: #1a1a1a; }
.ai-report-item.selected .ai-report-title { color: #f9fafb; }
.ai-report-item.selected .ai-report-date { color: #6b7280; }
.ai-report-title {
    display: block;
    font-size: 0.825rem;
    font-weight: 500;
    color: #1a1a1a;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 0.15rem;
}
.ai-report-date {
    display: block;
    font-size: 0.725rem;
    color: #9ca3af;
}
.ai-empty {
    text-align: center;
    color: #9ca3af;
    font-size: 0.825rem;
    padding: 1.5rem 0;
    margin: 0;
}

/* main */
.ai-main {}
.ai-empty-state {
    background: #fff;
    border: 1.5px dashed #d1d5db;
    border-radius: 12px;
    padding: 4rem 2rem;
    text-align: center;
    color: #9ca3af;
    font-size: 0.9rem;
}
.ai-empty-icon { font-size: 2.5rem; display: block; margin-bottom: 0.75rem; }

/* detail */
.ai-detail {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    animation: ai-fadein 0.25s ease;
}
@keyframes ai-fadein {
    from { opacity: 0; transform: translateY(5px); }
    to   { opacity: 1; transform: translateY(0); }
}

/* cards */
.ai-card {
    background: #fff;
    border: 1px solid #e5e7eb;
    border-radius: 12px;
    padding: 1.25rem;
}
.ai-score-card {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: flex-start;
    justify-content: space-between;
}
.ai-score-left { flex: 1; min-width: 0; }
.ai-report-name {
    font-family: 'DM Serif Display', serif;
    font-size: 1.15rem;
    font-weight: 400;
    color: #1a1a1a;
    margin: 0 0 0.5rem;
}
.ai-report-summary {
    font-size: 0.875rem;
    color: #6b7280;
    line-height: 1.65;
    margin: 0;
}
.ai-score-right {
    text-align: center;
    flex-shrink: 0;
}
.ai-score-number {
    font-family: 'DM Serif Display', serif;
    font-size: 2.5rem;
    line-height: 1;
}
.ai-score-label {
    font-size: 0.725rem;
    color: #9ca3af;
    margin-top: 0.2rem;
}
.ai-score-bar-bg {
    margin-top: 0.4rem;
    height: 4px;
    width: 60px;
    background: #f3f4f6;
    border-radius: 4px;
    overflow: hidden;
}
.ai-score-bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.6s ease;
}
.ai-section-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: #1a1a1a;
    margin: 0 0 0.875rem;
}

/* insight items */
.ai-insight-card {
    border-radius: 8px;
    padding: 0.875rem 1rem;
    margin-bottom: 0.5rem;
}
.ai-insight-card:last-child { margin-bottom: 0; }
.ai-insight-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.3rem;
}
.ai-insight-title {
    font-size: 0.875rem;
    font-weight: 600;
}
.ai-insight-badge {
    font-size: 0.68rem;
    font-weight: 600;
    padding: 0.15rem 0.5rem;
    border-radius: 20px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    flex-shrink: 0;
}
.ai-insight-detail {
    font-size: 0.825rem;
    line-height: 1.6;
    margin: 0;
    opacity: 0.85;
}

/* ── MOBILE ── */
@media (max-width: 768px) {
    .ai-root {
        padding: 1rem;
    }
    .ai-body {
        grid-template-columns: 1fr;
    }
    .ai-sidebar {
        order: -1;
    }
    .ai-sidebar-inner {
        position: static;
    }
    .ai-report-list {
        max-height: 40vh;
    }
}
`;