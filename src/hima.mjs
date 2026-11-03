#!/usr/bin/env node

/**
 * 3AM SCROLL — HIMA Engine (Local PC CLI & Executable)
 * 
 * Human + AI Media Assembly:
 * 1. Signal / Trend Spotting
 * 2. Persona-Driven AI Drafting
 * 3. Anti-AI Linguistic Scrambler / Humanizer
 * 4. Editorial Visuals & Metadata
 * 5. Programmatic Quality Verification & Supabase Publishing
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";
import { marked } from "marked";

// --- ANSI Colors ---
const C = {
    reset: "\x1b[0m",
    bold: "\x1b[1m",
    dim: "\x1b[2m",
    green: "\x1b[32m",
    cyan: "\x1b[36m",
    yellow: "\x1b[33m",
    magenta: "\x1b[35m",
    red: "\x1b[31m",
    blue: "\x1b[34m",
};

// --- Load .env.local ---
function loadEnv() {
    const candidateDirs = [
        process.cwd(),
        path.dirname(process.execPath),
        path.join(process.cwd(), ".."),
        path.join(path.dirname(process.execPath), ".."),
        path.resolve(process.cwd(), ".."),
    ];
    const dirs = [...new Set(candidateDirs.filter(Boolean))];
    const env = {};

    for (const dir of dirs) {
        const envPath = path.join(dir, ".env.local");
        if (fs.existsSync(envPath)) {
            try {
                const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
                for (const line of lines) {
                    const match = line.trim().match(/^([^#=]+)=(.*)$/);
                    if (match) {
                        const key = match[1].trim();
                        let val = match[2].trim();
                        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                            val = val.slice(1, -1);
                        }
                        if (!env[key]) env[key] = val;
                    }
                }
            } catch {
                // Ignore file read error
            }
        }
    }
    return { ...env, ...process.env };
}

const ENV = loadEnv();
const GEMINI_API_KEY = ENV.GOOGLE_GEMINI_API_KEY || ENV.GEMINI_API_KEY;
const SUPABASE_URL = ENV.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = ENV.SUPABASE_SERVICE_ROLE_KEY || ENV.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BASE_URL = ENV.NEXT_PUBLIC_BASE_URL || "https://3amscroll.com";

// --- Writer Personas ---
const WRITERS = [
    {
        id: "maya-chen",
        name: "Maya Chen",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=maya",
        tone: "Analytical & sharp",
        style: "Data-driven, concise, skeptical of hype",
        focus: ["tech", "ai", "startups"],
        voicePrompt: "Write like a sharp tech analyst: lead with the signal, cite data points, cut marketing hype, end with an uncompromising verdict.",
    },
    {
        id: "jax-rivera",
        name: "Jax Rivera",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jax",
        tone: "Gen Z casual",
        style: "Conversational, meme-aware, punchy",
        focus: ["culture", "gaming", "entertainment"],
        voicePrompt: "Write like a Gen Z culture critic: casual, funny, self-aware, short paragraphs, talking like a late-night FaceTime call.",
    },
    {
        id: "priya-sharma",
        name: "Priya Sharma",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=priya",
        tone: "Warm & human",
        style: "Empathetic, story-led, accessible",
        focus: ["wellness", "health", "lifestyle"],
        voicePrompt: "Write like a wellness columnist: empathetic, human-centered, deconstructing digital burnout, offering realistic takeaways.",
    },
    {
        id: "leo-okonkwo",
        name: "Leo Okonkwo",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=leo",
        tone: "Bold & opinionated",
        style: "Strong takes, contrarian, confident",
        focus: ["hustle", "business", "politics"],
        voicePrompt: "Write like a bold career and economy writer: strong opinions, contrarian angles, confident, calling out corporate theatrics.",
    },
    {
        id: "sofia-martinez",
        name: "Sofia Martinez",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sofia",
        tone: "Investigative",
        style: "Deep-dive, evidence-based, thorough",
        focus: ["planet", "science", "opinion"],
        voicePrompt: "Write like an investigative reporter: deep context, evidence, scientific nuance, zero superficial hot takes.",
    },
    {
        id: "kai-tanaka",
        name: "Kai Tanaka",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=kai",
        tone: "Futurist",
        style: "Visionary, trend-forward, big picture",
        focus: ["tech", "science", "world"],
        voicePrompt: "Write like a futurist philosopher: big-picture, trend-forward, speculative but grounded in real technology vectors.",
    },
];

// --- Curated Stock Images Pool (Disabled for pure typography-first reading experience) ---
function pickCategoryCover() {
    return null;
}

function pickWriter(categoryOrTopic) {
    const lower = (categoryOrTopic || "").toLowerCase();
    const match = WRITERS.find((w) => w.focus.some((f) => lower.includes(f)));
    return match || WRITERS[Math.floor(Math.random() * WRITERS.length)];
}

// --- Gemini AI Wrapper (with automatic model fallbacks) ---
async function callGemini(systemInstruction, prompt) {
    if (!GEMINI_API_KEY) {
        throw new Error("Missing GOOGLE_GEMINI_API_KEY in .env.local");
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const candidateModels = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-3.8-flash"];

    let lastError = null;
    for (const modelName of candidateModels) {
        try {
            const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: systemInstruction,
                generationConfig: {
                    temperature: 0.75,
                    maxOutputTokens: 2500,
                },
            });

            const result = await model.generateContent(prompt);
            const text = result?.response?.text();
            if (text && text.trim().length > 0) {
                return text.trim();
            }
        } catch (err) {
            lastError = err;
        }
    }
    throw new Error(`Gemini AI call failed across all candidate models: ${lastError?.message || lastError}`);
}

// --- Programmatic Helpers ---
function cleanString(str) {
    if (!str) return "";
    return str
        .replace(/<!\[CDATA\[|\]\]>/g, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;|&apos;/g, "'")
        .replace(/\s+/g, " ")
        .trim();
}

function createSlug(title) {
    return cleanString(title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
        .slice(0, 80);
}

function calcReadTime(text) {
    const words = text.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
}

// --- RSS & Trend Fetching ---
async function fetchTrendingSignals() {
    const feeds = [
        { name: "Google Trends US", url: "https://trends.google.com/trends/trendingsearches/daily/rss?geo=US" },
        { name: "The Verge", url: "https://www.theverge.com/rss/index.xml" },
        { name: "TechCrunch", url: "https://techcrunch.com/feed/" },
        { name: "Ars Technica", url: "https://feeds.arstechnica.com/arstechnica/index" },
    ];

    const signals = [];
    for (const feed of feeds) {
        try {
            const res = await fetch(feed.url, { headers: { "User-Agent": "3AMScroll-HIMA/1.0" }, signal: AbortSignal.timeout(6000) });
            if (!res.ok) continue;
            const xml = await res.text();
            const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

            for (const itemXml of itemMatches.slice(0, 4)) {
                const titleMatch = itemXml.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
                const descMatch = itemXml.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/i);
                const title = cleanString(titleMatch ? titleMatch[1] : "");
                const desc = cleanString(descMatch ? descMatch[1] : "");
                if (title && title.length > 5) {
                    signals.push({ title, desc, source: feed.name });
                }
            }
        } catch {
            // Ignore feed timeout
        }
    }
    return signals;
}

// --- The 5-Stage HIMA Pipeline Execution ---
async function runHimaPipeline({ topicIdea, requestedWriter, status = "published", dryRun = false }) {
    console.log(`\n${C.bold}${C.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}`);
    console.log(`${C.bold}${C.cyan}  ⚡ HIMA ENGINE: Executing 5-Stage Media Assembly Pipeline${C.reset}`);
    console.log(`${C.dim}  Topic Input: "${topicIdea}"${C.reset}`);
    console.log(`${C.bold}${C.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}\n`);

    // STAGE 1: TREND SPOTTING & ANGLE REFINEMENT
    process.stdout.write(`${C.bold}[1/5] 📡 STAGE 1: Signal & Angle Refinement...${C.reset} `);

    const stage1Prompt = `
You are the Executive Editor for '3AM SCROLL' (a high-signal, anti-brainrot Gen Z publication).
Analyze the raw topic or headline: "${topicIdea}".

Provide a JSON object with:
1. "workingTitle": A punchy, cinematic, scroll-stopping headline (max 75 characters). Avoid generic clickbait, sound smart and culturally plugged-in.
2. "seoKeyword": A specific 1-3 word search query term.
3. "category": Pick ONE from: tech, culture, hustle, wellness, planet, world.
4. "coreAngle": A 2-sentence thesis explaining why this matters at 3 AM to young people.

Return ONLY valid JSON (no markdown fences, no raw text):
`;
    const stage1Raw = await callGemini("You are an expert editorial strategist.", stage1Prompt);
    let stage1Data;
    try {
        const cleanJson = stage1Raw.replace(/```json/g, "").replace(/```/g, "").trim();
        stage1Data = JSON.parse(cleanJson);
    } catch {
        stage1Data = {
            workingTitle: topicIdea.slice(0, 75),
            seoKeyword: topicIdea.split(" ").slice(0, 3).join(" "),
            category: "tech",
            coreAngle: `A deep breakdown on ${topicIdea} and what comes next.`,
        };
    }

    const category = (stage1Data.category || "tech").toLowerCase();
    const writer = requestedWriter
        ? WRITERS.find((w) => w.id === requestedWriter) || pickWriter(category)
        : pickWriter(category);

    console.log(`${C.green}✓ DONE${C.reset}`);
    console.log(`      Title: ${C.bold}"${stage1Data.workingTitle}"${C.reset}`);
    console.log(`      Angle: ${C.dim}${stage1Data.coreAngle}${C.reset}`);
    console.log(`      Writer: ${C.cyan}${writer.name}${C.reset} (${writer.tone}) | Category: ${category.toUpperCase()}`);

    // STAGE 2: PERSONA-DRIVEN ARTICLE DRAFTING
    process.stdout.write(`\n${C.bold}[2/5] ✍️ STAGE 2: Persona-Driven Drafting (${writer.name})...${C.reset} `);

    const stage2System = `You are ${writer.name}, a core columnist for 3AM SCROLL.
Persona Tone: ${writer.tone}
Persona Style: ${writer.style}
Directive: ${writer.voicePrompt}
Brand rules:
- Talk directly to the reader with sharp authenticity.
- Zero corporate buzzwords. NO "in today's digital landscape", NO "delve", NO "testament".
- Deep substance with high conversational rhythm.
- Format with rich Markdown: punchy opening paragraph, clear thematic '## ' headings, bold stats, bulleted observations, and actionable closure.`;

    const stage2Prompt = `
Write a complete, high-impact article for 3AM SCROLL:
Headline: ${stage1Data.workingTitle}
Target Category: ${category}
SEO Target Keyword: ${stage1Data.seoKeyword}
Core Thesis / Angle: ${stage1Data.coreAngle}

Length target: 450 to 700 words.
Do NOT include the H1 title at the top; start directly with the opening narrative hook.
`;

    const rawDraft = await callGemini(stage2System, stage2Prompt);
    const draftWords = rawDraft.split(/\s+/).filter(Boolean).length;
    console.log(`${C.green}✓ DONE${C.reset} (${draftWords} words)`);

    // STAGE 3: LINGUISTIC SCRAMBLER (ANTI-AI HUMANIZER)
    process.stdout.write(`\n${C.bold}[3/5] 🧠 STAGE 3: Linguistic Scrambler (Anti-AI Humanization)...${C.reset} `);

    const stage3Prompt = `
You are an expert human prose stylist and anti-AI linguistic editor.
Your job is to rewrite the draft below so it reads 100% human, eliminating all traces of LLM predictability:

Rules:
1. Maximize burstiness and perplexity: mix 3-word fragments with complex, flowing observations.
2. Inject human conversational cadence: em-dashes, candid side-notes, real analogies.
3. Completely purge AI cliches: "delve", "testament", "tapestry", "crucial", "landscape", "moreover", "furthermore", "in conclusion", "it's important to remember".
4. Retain all factual information, subheadings (##), and formatting structure.
5. Do NOT add any preamble or chat. Output ONLY the polished humanized Markdown.

Original Draft:
${rawDraft}
`;

    const humanizedMarkdown = await callGemini("You are a master human prose stylist.", stage3Prompt);
    const finalWords = humanizedMarkdown.split(/\s+/).filter(Boolean).length;
    console.log(`${C.green}✓ DONE${C.reset} (${finalWords} words)`);

    // STAGE 4: TECHNICAL SEO & EDITORIAL DECK (Text-First Reading Sanctuary)
    process.stdout.write(`\n${C.bold}[4/5] 🎯 STAGE 4: Technical SEO & Editorial Deck...${C.reset} `);

    const stage4Prompt = `
Generate SEO metadata and editorial deck for this article:
Title: ${stage1Data.workingTitle}
Content excerpt: ${humanizedMarkdown.slice(0, 300)}

Return a strict JSON object with:
1. "excerpt": A compelling 1-2 sentence editorial teaser / deck (max 140 chars).
2. "seoTitle": High-CTR search title under 60 chars.
3. "seoDescription": Meta description between 120 and 155 chars.

Return ONLY raw JSON:
`;
    const stage4Raw = await callGemini("You are a senior technical SEO director.", stage4Prompt);
    let stage4Data;
    try {
        const cleanJson = stage4Raw.replace(/```json/g, "").replace(/```/g, "").trim();
        stage4Data = JSON.parse(cleanJson);
    } catch {
        stage4Data = {
            excerpt: cleanString(humanizedMarkdown.split("\n").find((l) => l.length > 30 && !l.startsWith("#")) || stage1Data.coreAngle).slice(0, 140),
            seoTitle: stage1Data.workingTitle.slice(0, 60),
            seoDescription: stage1Data.coreAngle.slice(0, 150),
        };
    }

    console.log(`${C.green}✓ DONE${C.reset}`);
    console.log(`      SEO Title: ${C.dim}${stage4Data.seoTitle}${C.reset}`);
    console.log(`      Teaser:    ${C.dim}${stage4Data.excerpt}${C.reset}`);

    // STAGE 5: PROGRAMMATIC QUALITY CHECKS & PUBLISHING
    process.stdout.write(`\n${C.bold}[5/5] 🚀 STAGE 5: Programmatic Gate & Supabase Publishing...${C.reset} `);

    const htmlContent = marked.parse(humanizedMarkdown);
    const slug = createSlug(stage1Data.workingTitle);
    const readTime = calcReadTime(humanizedMarkdown);

    if (finalWords < 180) {
        throw new Error(`Quality check failed: article word count (${finalWords}) is below minimum threshold.`);
    }

    if (dryRun) {
        console.log(`${C.yellow}✓ DRY RUN COMPLETE (Skipped DB Write)${C.reset}\n`);
        console.log(`${C.bold}Previewing Article Output:${C.reset}`);
        console.log(`----------------------------------------------------------------`);
        console.log(`${C.bold}${stage1Data.workingTitle}${C.reset}`);
        console.log(`${C.dim}By ${writer.name} | ${readTime} min read | Category: ${category}${C.reset}\n`);
        console.log(humanizedMarkdown.slice(0, 500) + "\n...\n");
        return { success: true, dryRun: true, slug };
    }

    if (!SUPABASE_URL || !SUPABASE_KEY) {
        throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    }
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check Human-in-the-Loop (HITL) gate in system_settings
    let effectiveStatus = status;
    try {
        const { data: hitlSetting } = await supabase
            .from("system_settings")
            .select("value")
            .eq("key", "human_in_loop")
            .single();

        if (hitlSetting?.value?.enabled && status === "published") {
            console.log(`\n      ${C.yellow}⚠️  [HITL GATE] Human-in-the-Loop is ON in Admin Panel.`);
            console.log(`         Overriding status: 'PUBLISHED' -> 'DRAFT' for admin editorial review.${C.reset}`);
            effectiveStatus = "draft";
        }
    } catch {
        // Fall back to requested status if table query fails
    }

    const articlePayload = {
        title: stage1Data.workingTitle,
        slug: slug,
        excerpt: stage4Data.excerpt || stage1Data.coreAngle.slice(0, 140),
        content: htmlContent,
        cover_image: null,
        category: category,
        status: effectiveStatus,
        source_url: "#",
        author_id: writer.id,
        author_name: writer.name,
        author_avatar: writer.avatar,
        published_at: effectiveStatus === "published" ? new Date().toISOString() : null,
        read_time: readTime,
        views: 0,
        seo_title: stage4Data.seoTitle || stage1Data.workingTitle,
        seo_description: stage4Data.seoDescription || stage4Data.excerpt,
        focus_keyword: stage1Data.seoKeyword,
        cover_image_alt: null,
    };

    const { error } = await supabase.from("articles").insert(articlePayload).select().single();

    if (error) {
        if (error.code === "23505") {
            articlePayload.slug = `${slug}-${Math.floor(Math.random() * 899 + 100)}`;
            const { error: retryErr } = await supabase.from("articles").insert(articlePayload).select().single();
            if (retryErr) throw retryErr;
        } else {
            throw error;
        }
    }

    console.log(`${C.green}✓ PUBLISHED!${C.reset}\n`);
    const liveUrl = `${BASE_URL}/article/${articlePayload.slug}`;
    console.log(`${C.bold}${C.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}`);
    console.log(`${C.bold}🎉 ARTICLE IS LIVE ON 3AM SCROLL:${C.reset}`);
    console.log(`   ${C.cyan}${C.bold}${liveUrl}${C.reset}`);
    console.log(`   Title:     ${articlePayload.title}`);
    console.log(`   Author:    ${writer.name}`);
    console.log(`   Category:  ${category.toUpperCase()}`);
    console.log(`   Status:    ${status.toUpperCase()}`);
    console.log(`   Read Time: ${readTime} min (~${finalWords} words)`);
    console.log(`${C.bold}${C.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}\n`);

    return { success: true, liveUrl, slug: articlePayload.slug };
}

// --- Interactive Terminal Prompt ---
function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise((resolve) =>
        rl.question(query, (ans) => {
            rl.close();
            resolve(ans.trim());
        })
    );
}

async function keepWindowOpen() {
    return new Promise((resolve) => {
        try {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout,
            });
            rl.question(`\n${C.yellow}Press Enter to exit...${C.reset}`, () => {
                rl.close();
                resolve();
            });
        } catch {
            resolve();
        }
    });
}

// Global exception safety nets
process.on("uncaughtException", async (err) => {
    console.error(`\n${C.bold}${C.red}══════════════════════════════════════════════════════════════════════${C.reset}`);
    console.error(`${C.bold}${C.red}  ❌ HIMA UNCAUGHT EXCEPTION${C.reset}`);
    console.error(`${C.bold}${C.red}══════════════════════════════════════════════════════════════════════${C.reset}`);
    console.error(err?.message || err);
    if (err?.stack) console.error(err.stack);
    await keepWindowOpen();
    process.exit(1);
});

process.on("unhandledRejection", async (reason) => {
    console.error(`\n${C.bold}${C.red}══════════════════════════════════════════════════════════════════════${C.reset}`);
    console.error(`${C.bold}${C.red}  ❌ HIMA UNHANDLED REJECTION${C.reset}`);
    console.error(`${C.bold}${C.red}══════════════════════════════════════════════════════════════════════${C.reset}`);
    console.error(reason);
    await keepWindowOpen();
    process.exit(1);
});

// --- Main Program Entry Point ---
async function main() {
    const args = process.argv.slice(2);

    // Validate Keys
    if (!GEMINI_API_KEY) {
        console.error(`\n${C.bold}${C.red}╔══════════════════════════════════════════════════════════════════════╗${C.reset}`);
        console.error(`${C.bold}${C.red}║  ⚠️  CONFIG ERROR: GOOGLE_GEMINI_API_KEY is not defined in .env.local ║${C.reset}`);
        console.error(`${C.bold}${C.red}╚══════════════════════════════════════════════════════════════════════╝${C.reset}`);
        console.error(`Please ensure .env.local exists in this directory or next to the executable.`);
        await keepWindowOpen();
        process.exit(1);
    }

    // Parse CLI Flags
    const hasAuto = args.includes("--auto");
    const hasContinuous = args.includes("--continuous") || args.includes("--loop");
    const dryRun = args.includes("--dry-run");
    const isDraft = args.includes("--draft");
    const status = isDraft ? "draft" : "published";

    const topicIndex = args.indexOf("--topic");
    const cliTopic = topicIndex !== -1 && args[topicIndex + 1] ? args[topicIndex + 1] : null;

    const intervalIndex = args.indexOf("--interval");
    const rawInterval = intervalIndex !== -1 && args[intervalIndex + 1] ? args[intervalIndex + 1] : "3h";

    // 1. Direct Topic Argument
    if (cliTopic) {
        await runHimaPipeline({ topicIdea: cliTopic, status, dryRun });
        return;
    }

    // 2. Continuous Daemon Mode
    if (hasContinuous) {
        let hours = 3;
        if (rawInterval.endsWith("h")) hours = parseFloat(rawInterval);
        else if (rawInterval.endsWith("m")) hours = parseFloat(rawInterval) / 60;
        const intervalMs = Math.max(10, hours * 60 * 60) * 1000;

        console.clear();
        console.log(`${C.bold}${C.magenta}========================================================================${C.reset}`);
        console.log(`${C.bold}${C.cyan}  ⚡ 3AM SCROLL — HIMA Continuous Auto-Publisher Daemon${C.reset}`);
        console.log(`  Cycle Interval: ${C.yellow}Every ${hours} hour(s)${C.reset} | Status: ${C.green}${status.toUpperCase()}${C.reset}`);
        console.log(`${C.dim}  Press Ctrl+C at any time to halt.${C.reset}`);
        console.log(`${C.bold}${C.magenta}========================================================================${C.reset}\n`);

        async function tick() {
            try {
                console.log(`\n[${new Date().toLocaleTimeString()}] Fetching fresh signals...`);
                const signals = await fetchTrendingSignals();
                const signal = signals[Math.floor(Math.random() * signals.length)] || {
                    title: "The Next Era of Generative Systems and the Creative Identity",
                };
                console.log(`Selected Trend Signal: "${signal.title}" (${signal.source || "Google Trends"})`);
                await runHimaPipeline({ topicIdea: signal.title, status, dryRun });
            } catch (err) {
                console.error(`${C.red}Error in HIMA tick:${C.reset}`, err.message);
            }
            console.log(`\n${C.dim}Sleeping until next publishing run in ${hours} hour(s)...${C.reset}`);
        }

        await tick();
        setInterval(tick, intervalMs);
        return; // Continuous mode runs in background
    }

    // 3. Single Auto Run (or dry run with auto)
    if (hasAuto) {
        console.log(`\n[HIMA] Discovering real-time trend signals...`);
        const signals = await fetchTrendingSignals();
        const signal = signals[Math.floor(Math.random() * signals.length)] || {
            title: "Why Gen Z is ditching algorithmic feeds for digital sanctuaries",
        };
        console.log(`Selected Signal: "${signal.title}" (${signal.source || "Web"})\n`);
        await runHimaPipeline({ topicIdea: signal.title, status, dryRun });
        return;
    }

    // 4. Interactive Studio Menu Loop
    while (true) {
        console.clear();
        console.log(`${C.bold}${C.magenta}╔══════════════════════════════════════════════════════════════════════╗${C.reset}`);
        console.log(`${C.bold}${C.magenta}║${C.reset}   ${C.bold}${C.cyan}3AM SCROLL — HIMA LOCAL PUBLISHING STUDIO                         ${C.reset}${C.bold}${C.magenta}║${C.reset}`);
        console.log(`${C.bold}${C.magenta}║${C.reset}   ${C.dim}Human + AI Media Assembly Pipeline Running on Your PC              ${C.reset}${C.bold}${C.magenta}║${C.reset}`);
        console.log(`${C.bold}${C.magenta}╚══════════════════════════════════════════════════════════════════════╝${C.reset}\n`);

        console.log(`Select an option:`);
        console.log(`  ${C.bold}${C.green}1${C.reset}) 📝 Enter custom topic idea`);
        console.log(`  ${C.bold}${C.cyan}2${C.reset}) 📡 Auto-spot from live Google Trends & RSS feeds`);
        console.log(`  ${C.bold}${C.yellow}3${C.reset}) 🔄 Start continuous auto-publisher (loops every N hours)`);
        console.log(`  ${C.bold}${C.magenta}4${C.reset}) 🧪 Run a Dry-Run test (generates without publishing)`);
        console.log(`  ${C.bold}5${C.reset}) ❌ Exit\n`);

        const choice = await askQuestion(`${C.bold}Enter choice [1-5]: ${C.reset}`);

        if (choice === "1") {
            const topic = await askQuestion(`\n${C.cyan}Enter your topic or rough idea:${C.reset}\n> `);
            if (!topic.trim()) {
                console.log("No topic entered.");
            } else {
                const pubChoice = await askQuestion(`Publish live or save as draft? [P = published (default) / D = draft]: `);
                const selectedStatus = pubChoice.toLowerCase().startsWith("d") ? "draft" : "published";
                await runHimaPipeline({ topicIdea: topic.trim(), status: selectedStatus });
            }
            await askQuestion(`\n${C.yellow}Press Enter to return to main menu...${C.reset}`);
        } else if (choice === "2") {
            console.log(`\nFetching live signals...`);
            const signals = await fetchTrendingSignals();
            if (signals.length === 0) {
                console.log("Could not pull live signals. Falling back to default signal.");
                signals.push({ title: "The rise of indie game development and small studios", source: "Editorial" });
            }
            console.log(`\nDiscovered Trending Signals:`);
            signals.slice(0, 5).forEach((s, i) => {
                console.log(`  ${C.cyan}${i + 1}${C.reset}) ${s.title} ${C.dim}(${s.source})${C.reset}`);
            });
            const pickIdx = await askQuestion(`\nPick a signal [1-${Math.min(signals.length, 5)}] or press ENTER for random: `);
            const idx = parseInt(pickIdx, 10);
            const chosen = !isNaN(idx) && signals[idx - 1] ? signals[idx - 1] : signals[0];
            await runHimaPipeline({ topicIdea: chosen.title, status: "published" });
            await askQuestion(`\n${C.yellow}Press Enter to return to main menu...${C.reset}`);
        } else if (choice === "3") {
            const hoursInput = await askQuestion(`Publishing interval in hours [default 3]: `);
            const h = parseFloat(hoursInput) || 3;
            const intervalMs = h * 60 * 60 * 1000;
            console.log(`\n${C.green}Starting continuous daemon (publishing every ${h} hour(s)). Press Ctrl+C to stop.${C.reset}\n`);

            async function loop() {
                const signals = await fetchTrendingSignals();
                const chosen = signals[Math.floor(Math.random() * signals.length)] || {
                    title: "The Next Era of Generative Systems and the Creative Identity",
                };
                console.log(`\n[${new Date().toLocaleTimeString()}] Triggering scheduled HIMA run for: "${chosen.title}"`);
                await runHimaPipeline({ topicIdea: chosen.title, status: "published" });
                console.log(`\n${C.dim}Sleeping for ${h} hour(s)...${C.reset}`);
            }
            await loop();
            setInterval(loop, intervalMs);
            return; // Continuous mode runs in background
        } else if (choice === "4") {
            await runHimaPipeline({
                topicIdea: "Why Gen Z is falling in love with point-and-click mechanical keyboards",
                status: "draft",
                dryRun: true,
            });
            await askQuestion(`\n${C.yellow}Press Enter to return to main menu...${C.reset}`);
        } else if (choice === "5" || choice.toLowerCase() === "q" || choice.toLowerCase() === "exit") {
            console.log("\nGoodbye!");
            break;
        } else {
            console.log(`\nInvalid choice. Please select 1 through 5.`);
            await askQuestion(`\n${C.yellow}Press Enter to continue...${C.reset}`);
        }
    }
}

main()
    .then(async () => {
        const hasCliFlags = process.argv.slice(2).some((a) => a.startsWith("--"));
        if (!hasCliFlags && !process.argv.includes("--continuous") && !process.argv.includes("--loop")) {
            await keepWindowOpen();
        }
    })
    .catch(async (err) => {
        console.error(`\n${C.bold}${C.red}══════════════════════════════════════════════════════════════════════${C.reset}`);
        console.error(`${C.bold}${C.red}  ❌ HIMA ERROR DETECTED${C.reset}`);
        console.error(`${C.bold}${C.red}══════════════════════════════════════════════════════════════════════${C.reset}`);
        console.error(err?.message || err);
        if (err?.stack) {
            console.error(`\n${C.dim}${err.stack}${C.reset}`);
        }
        await keepWindowOpen();
        process.exit(1);
    });
