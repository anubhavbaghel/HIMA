#!/usr/bin/env node

/**
 * 3AM SCROLL — HIMA Engine v2.0 (High-velocity Independent Media Agent)
 * 
 * Continuous Newsroom Simulator & Automated Publishing Pipeline:
 * 1. Multi-Beat Signal Discovery (Google Trends, Tech, Culture, Gaming, Finance RSS)
 * 2. Specialized Editorial Personas mapped to 15 distinct categories
 * 3. 5-Stage Human + AI Media Assembly (Signal -> Persona -> Humanize -> SEO -> Publish)
 * 4. Realistic Newsroom Cadence (pacing with natural human jitter)
 * 5. Dynamic Human-in-the-Loop (HITL) gate synchronization with 3amscroll Admin Studio
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

// --- Full 15-Category Newsroom Matrix ---
const CATEGORIES = [
    { id: "tech", name: "Technology", focus: "AI, gadgets, software shifts, hardware, developers" },
    { id: "ai", name: "AI & Future", focus: "Autonomous agents, generative models, robotics, post-labor economics" },
    { id: "gaming", name: "Gaming", focus: "Video games, indie creations, game design, modding, virtual worlds" },
    { id: "culture", name: "Culture", focus: "Internet lore, subcultures, digital behaviors, creator shifts" },
    { id: "money", name: "Money & Hustle", focus: "Onchain markets, indie hacking, creator economics, modern work" },
    { id: "style", name: "Style", focus: "Archival fashion, streetwear, internet aesthetics, design movements" },
    { id: "night", name: "Nocturnal Mind", focus: "Late-night philosophy, sleep architecture, quiet hours, mental clarity" },
    { id: "science", name: "Science", focus: "Space discoveries, physics, neuroscience, deep frontiers" },
    { id: "health", name: "Health & Wellness", focus: "Biohacking, longevity, fitness, mental health, somatic balance" },
    { id: "world", name: "World", focus: "Geopolitical shifts, international youth movements, global chronicles" },
    { id: "business", name: "Business", focus: "Market disruptions, startup ecosystems, company dissections" },
    { id: "entertainment", name: "Entertainment", focus: "Cinema, television, underground music, streaming culture" },
    { id: "planet", name: "Environment", focus: "Climate tech, biodiversity, solar punk, ecological stewardship" },
    { id: "opinion", name: "Opinion", focus: "Unfiltered commentary, cultural criticism, contrarian essays" },
    { id: "sports", name: "Sports", focus: "Athletics, extreme sports, competitive psychology, physical human limits" },
];

// --- Dedicated Staff Columnists ---
const WRITERS = [
    {
        id: "maya-chen",
        name: "Maya Chen",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=maya",
        tone: "Analytical & sharp",
        style: "Data-driven, concise, skeptical of hype",
        focus: ["tech", "business", "startups"],
        voicePrompt: "Write like a sharp tech analyst: lead with the signal, cite data points, cut marketing hype, end with an uncompromising verdict.",
    },
    {
        id: "sora-takahashi",
        name: "Sora Takahashi",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sora",
        tone: "Futurist & architectural",
        style: "Systems thinker, vision-forward, precise",
        focus: ["ai", "future", "tech"],
        voicePrompt: "Write like a frontier AI researcher and systems thinker: explain how models shift human agency, society, and cognition with lucid depth.",
    },
    {
        id: "nico-mercer",
        name: "Nico Mercer",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=nico",
        tone: "Immersive & critical",
        style: "Game-literate, atmospheric, detail-heavy",
        focus: ["gaming", "virtual", "entertainment"],
        voicePrompt: "Write like an auteur video game journalist: deconstruct ludonarratives, sensory mechanics, and gaming subcultures with reverence.",
    },
    {
        id: "jax-rivera",
        name: "Jax Rivera",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jax",
        tone: "Gen Z casual & punchy",
        style: "Conversational, meme-aware, razor-sharp",
        focus: ["culture", "entertainment", "social"],
        voicePrompt: "Write like a Gen Z culture critic: casual, funny, self-aware, short paragraphs, talking like a late-night FaceTime call.",
    },
    {
        id: "maya-lin",
        name: "Maya Lin",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=mayalin",
        tone: "Pragmatic & independent",
        style: "Direct, financially literate, anti-corporate",
        focus: ["money", "crypto", "business", "hustle"],
        voicePrompt: "Write like an independent financial strategist: break down onchain flows, solopreneur leverage, and the realities of modern wealth.",
    },
    {
        id: "elena-rostova",
        name: "Elena Rostova",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=elena",
        tone: "Aesthetic & observant",
        style: "Curated, textural, culturally grounded",
        focus: ["style", "fashion", "culture", "design"],
        voicePrompt: "Write like a visual culture essayist: dissect why aesthetics surge, how clothes signal tribe, and what archival designs reveal.",
    },
    {
        id: "rowan-miller",
        name: "Rowan Miller",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=rowan",
        tone: "Introspective & nocturnal",
        style: "Atmospheric, philosophical, comforting",
        focus: ["night", "mind", "philosophy", "lifestyle"],
        voicePrompt: "Write like a late-night essayist: meditative, exploring solitude, the stillness of 3 AM, and why the night unlocks clarity.",
    },
    {
        id: "priya-sharma",
        name: "Priya Sharma",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=priya",
        tone: "Empathetic & clinical",
        style: "Evidence-based, accessible, grounding",
        focus: ["health", "wellness", "lifestyle"],
        voicePrompt: "Write like a modern wellness columnist: deconstruct nervous systems, sleep architecture, and digital burnout with real science.",
    },
    {
        id: "darius-cole",
        name: "Darius Cole",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=darius",
        tone: "Global & macro",
        style: "Geopolitical context, nuanced, urgent",
        focus: ["world", "politics", "society"],
        voicePrompt: "Write like an international correspondent: connect global macro shifts to everyday reality without bias or state PR.",
    },
    {
        id: "kai-tanaka",
        name: "Kai Tanaka",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=kai",
        tone: "Awe-inspiring & rigorous",
        style: "Scientific, wonder-filled, clear",
        focus: ["science", "space", "physics"],
        voicePrompt: "Write like a science communicator: translate complex discoveries into breathtaking perspective on humanity's place in the cosmos.",
    },
    {
        id: "tate-harrison",
        name: "Tate Harrison",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=tate",
        tone: "Unfiltered & contrarian",
        style: "Sharp, provocative, incisive",
        focus: ["opinion", "critique", "culture"],
        voicePrompt: "Write like a fearless cultural polemicist: dismantle sacred cows of the internet, question consensus, and leave the reader thinking.",
    },
    {
        id: "sofia-martinez",
        name: "Sofia Martinez",
        avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sofia",
        tone: "Eco-realistic & urgent",
        style: "Investigative, practical, forward-looking",
        focus: ["planet", "environment", "climate"],
        voicePrompt: "Write like a climate-tech reporter: skip the doom-mongering, focus on real engineering, biodiversity, and how humans survive.",
    },
];

function pickWriter(categoryOrTopic) {
    const lower = (categoryOrTopic || "").toLowerCase();
    const match = WRITERS.find((w) => w.focus.some((f) => lower.includes(f)));
    return match || WRITERS[Math.floor(Math.random() * WRITERS.length)];
}

// --- Gemini AI Wrapper ---
async function callGemini(systemInstruction, prompt) {
    if (!GEMINI_API_KEY) {
        throw new Error("Missing GOOGLE_GEMINI_API_KEY in .env.local");
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const candidateModels = ["gemini-3.5-flash", "gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-2.5-flash-lite"];

    let lastError = null;
    for (const modelName of candidateModels) {
        for (let attempt = 1; attempt <= 2; attempt++) {
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
                // If temporary overload or rate spike, wait briefly before next attempt/model
                if (err?.message?.includes("503") || err?.message?.includes("429")) {
                    await new Promise((r) => setTimeout(r, 2000));
                }
            }
        }
    }
    throw new Error(`Gemini AI call failed across all candidate models: ${lastError?.message || lastError}`);
}

// --- Programmatic Helpers ---
function cleanString(str) {
    if (!str) return "";
    return str
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .trim();
}

function createSlug(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)+/g, "")
        .slice(0, 80);
}

function calcReadTime(text) {
    const words = text.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
}

// --- Multi-Beat Signal Discovery ---
async function fetchTrendingSignals(preferredCategory) {
    const feeds = [
        { name: "Google Trends US", category: "culture", url: "https://trends.google.com/trends/trendingsearches/daily/rss?geo=US" },
        { name: "The Verge", category: "tech", url: "https://www.theverge.com/rss/index.xml" },
        { name: "Ars Technica", category: "science", url: "https://feeds.arstechnica.com/arstechnica/index" },
        { name: "TechCrunch", category: "business", url: "https://techcrunch.com/feed/" },
    ];

    const signals = [];
    for (const feed of feeds) {
        if (preferredCategory && feed.category !== preferredCategory && Math.random() > 0.3) {
            continue;
        }
        try {
            const res = await fetch(feed.url, { headers: { "User-Agent": "3AMScroll-HIMA/2.0" }, signal: AbortSignal.timeout(5000) });
            if (!res.ok) continue;
            const xml = await res.text();
            const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

            for (const itemXml of itemMatches.slice(0, 3)) {
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

// Zeitgeist Ideation Fallback: Generates a category-native pitch if no RSS fits
async function generateZeitgeistTopic(categoryObj) {
    const prompt = `
You are an editorial trend spotter for '3AM SCROLL', a high-signal late-night Gen Z publication.
Generate ONE ultra-specific, timely story topic for the category "${categoryObj.name}" (${categoryObj.focus}).
It must feel like a genuine late-night deep dive that digital natives would debate at 3 AM.
Return ONLY the headline topic as a single plain-text line (no quotes, no intro).
`;
    try {
        const topic = await callGemini("You are a culture strategist.", prompt);
        return topic.replace(/^["']|["']$/g, "").trim();
    } catch {
        return `How the evolution of ${categoryObj.name} is transforming the digital generation`;
    }
}

// --- The 5-Stage HIMA Pipeline Execution ---
async function runHimaPipeline({ topicIdea, requestedCategory, requestedWriter, status = "published", dryRun = false }) {
    console.log(`\n${C.bold}${C.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}`);
    console.log(`${C.bold}${C.cyan}  ⚡ HIMA ENGINE v2.0: Media Assembly Pipeline${C.reset}`);
    console.log(`${C.dim}  Input Signal: "${topicIdea}"${C.reset}`);
    console.log(`${C.bold}${C.magenta}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}\n`);

    // STAGE 1: TREND SPOTTING & ANGLE REFINEMENT
    process.stdout.write(`${C.bold}[1/5] 📡 STAGE 1: Signal & Angle Refinement...${C.reset} `);

    const validCategoryIds = CATEGORIES.map((c) => c.id).join(", ");
    const stage1Prompt = `
You are the Executive Editor for '3AM SCROLL' (a high-signal, anti-brainrot Gen Z publication).
Analyze the raw topic or headline: "${topicIdea}".
Target Category Hint (if provided): "${requestedCategory || 'any'}".

Provide a JSON object with:
1. "workingTitle": A punchy, cinematic, scroll-stopping headline (max 75 characters). Sound culturally plugged-in, sharp, and engaging.
2. "seoKeyword": A specific 1-3 word search query term.
3. "category": Pick ONE from: ${validCategoryIds}.
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
            category: requestedCategory || "tech",
            coreAngle: `A deep breakdown on ${topicIdea} and what comes next.`,
        };
    }

    const category = (requestedCategory || stage1Data.category || "tech").toLowerCase();
    const writer = requestedWriter
        ? WRITERS.find((w) => w.id === requestedWriter) || pickWriter(category)
        : pickWriter(category);

    console.log(`${C.green}✓ DONE${C.reset}`);
    console.log(`      Title:  ${C.bold}"${stage1Data.workingTitle}"${C.reset}`);
    console.log(`      Angle:  ${C.dim}${stage1Data.coreAngle}${C.reset}`);
    console.log(`      Writer: ${C.cyan}${writer.name}${C.reset} (${writer.tone}) | Beat: ${C.yellow}${category.toUpperCase()}${C.reset}`);

    // STAGE 2: PERSONA-DRIVEN ARTICLE DRAFTING
    process.stdout.write(`\n${C.bold}[2/5] ✍️ STAGE 2: Persona-Driven Drafting (${writer.name})...${C.reset} `);

    const stage2System = `You are ${writer.name}, a staff columnist for 3AM SCROLL.
Persona Tone: ${writer.tone}
Persona Style: ${writer.style}
Directive: ${writer.voicePrompt}
Brand rules:
- Talk directly to the reader with uncompromising authenticity.
- Zero corporate fluff. NO "in today's digital landscape", NO "delve", NO "testament".
- High conversational rhythm, authentic cultural references.
- Format with rich Markdown: punchy narrative hook, clear thematic '## ' headings, bulleted observations, and memorable takeaway.`;

    const stage2Prompt = `
Write a complete, high-impact article for 3AM SCROLL:
Headline: ${stage1Data.workingTitle}
Target Category: ${category}
SEO Target Keyword: ${stage1Data.seoKeyword}
Core Thesis / Angle: ${stage1Data.coreAngle}

Length target: 450 to 700 words.
Do NOT include the H1 title at the top; start directly with the opening hook.
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

    // STAGE 4: TECHNICAL SEO & EDITORIAL DECK
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
    process.stdout.write(`\n${C.bold}[5/5] 🚀 STAGE 5: Quality Gate & Supabase Publishing...${C.reset} `);

    const htmlContent = marked.parse(humanizedMarkdown);
    const slug = createSlug(stage1Data.workingTitle);
    const readTime = calcReadTime(humanizedMarkdown);

    if (finalWords < 180) {
        throw new Error(`Quality check failed: word count (${finalWords}) is below minimum threshold.`);
    }

    if (dryRun) {
        console.log(`${C.yellow}✓ DRY RUN COMPLETE (Skipped DB Write)${C.reset}\n`);
        return { success: true, dryRun: true, slug, title: stage1Data.workingTitle, category, author: writer.name };
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
            console.log(`\n      ${C.yellow}⚠️  [HITL GATE ACTIVE] Human-in-the-Loop is ON in Admin Studio.`);
            console.log(`         Status held as: 'DRAFT' for admin signoff.${C.reset}`);
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

    console.log(`${C.green}✓ SUCCESS!${C.reset}\n`);
    const liveUrl = `${BASE_URL}/article/${articlePayload.slug}`;
    console.log(`${C.bold}${C.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}`);
    console.log(`${C.bold}🎉 ARTICLE ${effectiveStatus === "published" ? "LIVE ON 3AM SCROLL" : "HELD AS DRAFT"}:${C.reset}`);
    console.log(`   ${C.cyan}${C.bold}${liveUrl}${C.reset}`);
    console.log(`   Title:     ${articlePayload.title}`);
    console.log(`   Author:    ${writer.name}`);
    console.log(`   Category:  ${category.toUpperCase()}`);
    console.log(`   Status:    ${effectiveStatus.toUpperCase()}`);
    console.log(`   Read Time: ${readTime} min (~${finalWords} words)`);
    console.log(`${C.bold}${C.green}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.reset}\n`);

    return { success: true, liveUrl, slug: articlePayload.slug, title: articlePayload.title, category, author: writer.name };
}

// --- Sleep Helper with Visual Countdown ---
async function countdownSleep(seconds) {
    const start = Date.now();
    const end = start + seconds * 1000;

    return new Promise((resolve) => {
        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.ceil((end - Date.now()) / 1000));
            const m = Math.floor(remaining / 60);
            const s = remaining % 60;
            const timeStr = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
            process.stdout.write(`\r${C.dim}⏳ Next story edition dropping in ${C.yellow}${timeStr}${C.dim}... (Press Ctrl+C to stop)${C.reset}  `);

            if (remaining <= 0) {
                clearInterval(interval);
                process.stdout.write("\r                                                                    \r");
                resolve();
            }
        }, 1000);
    });
}

// --- Continuous Newsroom Simulator ---
async function startContinuousNewsroom({ intervalSeconds = 300, dryRun = false }) {
    let articleCount = 0;
    let categoryIndex = 0;

    console.clear();
    console.log(`${C.bold}${C.magenta}╔══════════════════════════════════════════════════════════════════════╗${C.reset}`);
    console.log(`${C.bold}${C.magenta}║${C.reset}   ${C.bold}${C.cyan}3AM SCROLL — CONTINUOUS NEWSROOM AUTOPILOT (v2.0)                 ${C.reset}${C.bold}${C.magenta}║${C.reset}`);
    console.log(`${C.bold}${C.magenta}║${C.reset}   ${C.dim}Systematic publishing across all 15 beats with humanized pacing     ${C.reset}${C.bold}${C.magenta}║${C.reset}`);
    console.log(`${C.bold}${C.magenta}╚══════════════════════════════════════════════════════════════════════╝${C.reset}\n`);

    console.log(`Publishing Cadence: ${C.yellow}~Every ${Math.round(intervalSeconds / 60)} minute(s)${C.reset} (with natural jitter)`);
    console.log(`Target Beats:       ${C.green}${CATEGORIES.length} Categories${C.reset} in rotating newsroom cycles`);
    console.log(`Free Tier Safety:   Active (safe pacing, zero rate limit spikes)\n`);

    while (true) {
        const currentCategory = CATEGORIES[categoryIndex % CATEGORIES.length];
        categoryIndex++;
        articleCount++;

        console.log(`\n${C.bold}[NEWSROOM DISPATCH #${articleCount}] Beat: ${C.yellow}${currentCategory.name.toUpperCase()}${C.reset} | Time: ${new Date().toLocaleTimeString()}`);

        try {
            // Find or ideate signal for this specific beat
            const signals = await fetchTrendingSignals(currentCategory.id);
            let chosenTopic = "";
            if (signals.length > 0 && Math.random() > 0.4) {
                const s = signals[Math.floor(Math.random() * signals.length)];
                chosenTopic = s.title;
            } else {
                chosenTopic = await generateZeitgeistTopic(currentCategory);
            }

            await runHimaPipeline({
                topicIdea: chosenTopic,
                requestedCategory: currentCategory.id,
                dryRun,
            });

            // Realistic human jitter: ±15 to ±45 seconds
            const jitter = Math.floor(Math.random() * 50) - 25;
            const sleepTime = Math.max(15, intervalSeconds + jitter);
            await countdownSleep(sleepTime);
        } catch (err) {
            console.error(`${C.red}Error in newsroom cycle:${C.reset}`, err.message);
            console.log(`${C.dim}Retrying next beat in 30 seconds...${C.reset}`);
            await countdownSleep(30);
        }
    }
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

// --- Main Program Entry Point ---
async function main() {
    const args = process.argv.slice(2);

    if (!GEMINI_API_KEY) {
        console.error(`\n${C.bold}${C.red}╔══════════════════════════════════════════════════════════════════════╗${C.reset}`);
        console.error(`${C.bold}${C.red}║  ⚠️  CONFIG ERROR: GOOGLE_GEMINI_API_KEY is not defined in .env.local ║${C.reset}`);
        console.error(`${C.bold}${C.red}╚══════════════════════════════════════════════════════════════════════╝${C.reset}`);
        process.exit(1);
    }

    const hasAutopilot = args.includes("--autopilot") || args.includes("--simulate") || args.includes("--continuous");
    const isFast = args.includes("--fast");
    const dryRun = args.includes("--dry-run");

    const categoryIdx = args.indexOf("--category");
    const cliCategory = categoryIdx !== -1 && args[categoryIdx + 1] ? args[categoryIdx + 1] : null;

    const topicIdx = args.indexOf("--topic");
    const cliTopic = topicIdx !== -1 && args[topicIdx + 1] ? args[topicIdx + 1] : null;

    const intervalIdx = args.indexOf("--interval");
    let intervalSeconds = isFast ? 60 : 300; // Default 5 minutes, fast 1 minute
    if (intervalIdx !== -1 && args[intervalIdx + 1]) {
        const raw = args[intervalIdx + 1];
        if (raw.endsWith("m")) intervalSeconds = parseFloat(raw) * 60;
        else if (raw.endsWith("s")) intervalSeconds = parseFloat(raw);
        else if (raw.endsWith("h")) intervalSeconds = parseFloat(raw) * 3600;
        else intervalSeconds = parseFloat(raw);
    }

    // Direct single topic
    if (cliTopic) {
        await runHimaPipeline({ topicIdea: cliTopic, requestedCategory: cliCategory, dryRun });
        return;
    }

    // Direct Autopilot / Continuous Newsroom
    if (hasAutopilot) {
        await startContinuousNewsroom({ intervalSeconds, dryRun });
        return;
    }

    // Interactive Menu Loop
    while (true) {
        console.clear();
        console.log(`${C.bold}${C.magenta}╔══════════════════════════════════════════════════════════════════════╗${C.reset}`);
        console.log(`${C.bold}${C.magenta}║${C.reset}   ${C.bold}${C.cyan}3AM SCROLL — HIMA NEWSROOM STUDIO v2.0                            ${C.reset}${C.bold}${C.magenta}║${C.reset}`);
        console.log(`${C.bold}${C.magenta}║${C.reset}   ${C.dim}High-Velocity Independent Media Agent for 3amscroll.com             ${C.reset}${C.bold}${C.magenta}║${C.reset}`);
        console.log(`${C.bold}${C.magenta}╚══════════════════════════════════════════════════════════════════════╝${C.reset}\n`);

        console.log(`Select an option:`);
        console.log(`  ${C.bold}${C.green}1${C.reset}) 📝 Pitch custom topic idea`);
        console.log(`  ${C.bold}${C.cyan}2${C.reset}) 📡 Auto-spot from live Google Trends & multi-beat feeds`);
        console.log(`  ${C.bold}${C.yellow}3${C.reset}) ⚡ Start Continuous Newsroom Simulator (Autopilot)`);
        console.log(`  ${C.bold}${C.blue}4${C.reset}) 🎯 Publish single article for a specific Category`);
        console.log(`  ${C.bold}${C.red}5${C.reset}) 🚪 Exit\n`);

        const choice = await askQuestion(`${C.bold}Enter your choice [1-5]: ${C.reset}`);

        if (choice === "1") {
            const topic = await askQuestion(`\nEnter your headline or topic idea: `);
            if (topic) {
                await runHimaPipeline({ topicIdea: topic });
                await askQuestion(`\nPress Enter to return to menu...`);
            }
        } else if (choice === "2") {
            console.log(`\nDiscovering live signals across tech, culture, and world feeds...`);
            const signals = await fetchTrendingSignals();
            const signal = signals[Math.floor(Math.random() * signals.length)] || {
                title: "Why Gen Z is ditching algorithmic feeds for digital sanctuaries",
            };
            console.log(`Selected Signal: "${signal.title}" (${signal.source})\n`);
            await runHimaPipeline({ topicIdea: signal.title });
            await askQuestion(`\nPress Enter to return to menu...`);
        } else if (choice === "3") {
            console.log(`\nSelect publishing cadence:`);
            console.log(`  a) Fast Testing (1 new story every 60 seconds)`);
            console.log(`  b) Active Newsroom (1 new story every 5 minutes) — Recommended`);
            console.log(`  c) Steady Daily Rhythm (1 new story every 15 minutes)`);
            const speedChoice = await askQuestion(`Enter choice [a/b/c] (default b): `);
            const pace = speedChoice === "a" ? 60 : speedChoice === "c" ? 900 : 300;
            await startContinuousNewsroom({ intervalSeconds: pace });
            return;
        } else if (choice === "4") {
            console.log(`\nAvailable Beats:`);
            CATEGORIES.forEach((cat, i) => console.log(`  ${i + 1}. ${cat.name} (${cat.id})`));
            const catPick = await askQuestion(`\nSelect beat number [1-${CATEGORIES.length}]: `);
            const idx = parseInt(catPick, 10) - 1;
            const chosenCategory = CATEGORIES[idx] || CATEGORIES[0];

            console.log(`\nGenerating story for beat: ${chosenCategory.name}...`);
            const topic = await generateZeitgeistTopic(chosenCategory);
            console.log(`Ideated Topic: "${topic}"\n`);
            await runHimaPipeline({ topicIdea: topic, requestedCategory: chosenCategory.id });
            await askQuestion(`\nPress Enter to return to menu...`);
        } else if (choice === "5") {
            console.log(`\nShutting down HIMA. Goodnight.\n`);
            process.exit(0);
        }
    }
}

main().catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
});
