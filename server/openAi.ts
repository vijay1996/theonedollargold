import OpenAi from 'openai';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import ws from 'ws';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL || '', process.env.SUPABASE_SERVICE_KEY || '', { realtime: { transport: ws as any } });

const openai = new OpenAi({
  apiKey: process.env.OPENAI_API_KEY,
});

const content = `
    You are a sharp, honest personal finance advisor. 
    You give direct, actionable advice based on the user's actual financial data.
    You flag red flags clearly, suggest improvements, and prioritize the most impactful changes.
    Be concise. No fluff. Talk like a trusted friend who knows finance — not a corporate report.
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

export default async function getReport() {
    const users = await getUsers();
    if (!users?.length) return console.log('No users found');

    for (const uid of users) {
        const [transactions, assetsAndLiabilities] = await Promise.all([
            getTransactions(uid),
            getAssetsAndLiabilities(uid)
        ]);

        const data = { transactions, assetsAndLiabilities };

        const response = await openai.chat.completions.create({
            model: 'gpt-4.1-nano',
            messages: [{ role: 'system', content: content + JSON.stringify(data) }]
        });

        const raw = response.choices[0].message.content || '{}';
        const {redFlags, suggestions, positives, overallHealthScore, summary} = safeParseReport(raw);
        const { v4: uuidv4 } = await import('uuid')
        const reportId: string = uuidv4();
        supabase.from('ai_insight').upsert({
            id: reportId,
            uid, 
            red_flags: JSON.stringify(redFlags), 
            suggestions: JSON.stringify(suggestions), 
            positives: JSON.stringify(positives), 
            overall_health_score: overallHealthScore, 
            summary,
            generatedat: new Date().toISOString().split('T')[0]
        }).then(({data, error}) => {
            if (error) {
                console.error('Supabase error:', error);
                return;
            }
            console.log(`✓ Report written for user ${uid}`);
        })
    }
}

async function getTransactions(userId: string) {
    const { data, error} = await supabase.from('transactions').select('*, categories(name)').eq('uid', userId);
    if (error) console.error('Supabase error:', error);
    const formattedData: {[key: string]: number} = {};
    data?.filter((transaction: transactionType) => {
        const [year, month, date] = transaction.date.split('-');
        const today = new Date();
        return month === String(today.getMonth() + 1) && year === String(today.getFullYear());
    }).forEach((transaction: transactionType) => {
        if (!formattedData[transaction.categories?.name]) {
            formattedData[transaction.categories?.name] = transaction.amount || 0;
        } else {
            formattedData[transaction.categories?.name] += transaction.amount
        }
    })
    return data;
}

async function getAssetsAndLiabilities(userId: string) {
    const { data, error } = await supabase.from('disclosures').select('*').eq('uid', userId);
    if (error) console.error('Supabase error:', error);
    const formattedData: {name: string, type: string, category: string, amount: number, currentValue?: number}[] = []
    data?.forEach(disclosure => {
        if (disclosure.type === 'asset') {
            formattedData.push({
                name: disclosure.name,
                type: disclosure.type,
                category: disclosure.category,
                amount: disclosure.amount,
                currentValue: disclosure.current_value,
            })
        } else {
            formattedData.push({
                name: disclosure.name,
                type: disclosure.type,
                category: disclosure.category,
                amount: disclosure.amount,
            })
        }
    })
    return formattedData;
}

async function getUsers() {
    const { data, error } = await supabase.from('users').select('*');
    if (error) console.error('Supabase error:', error);
    return data?.map(user => user.uid);
}

function safeParseReport(raw: string) {
    // Strip markdown code fences if model wraps in ```json
    console.log(raw);
    const cleaned = raw.replace(/^```json\n?/, '').replace(/```$/, '').trim();
    try {
        return JSON.parse(cleaned);
    } catch {
        // Try to extract JSON object with regex as fallback
        const match = cleaned.match(/\{[\s\S]*\}/);
        if (match) return JSON.parse(match[0]);
        throw new Error('Failed to parse AI response: ' + cleaned);
    }
}

interface transactionType {id:string, uid:string, date:string, category_id:string, amount: number, type:string, comment:string, subscription_id:string, categories: {name: string}}