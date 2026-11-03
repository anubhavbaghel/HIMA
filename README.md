# ⚡ HIMA — Human + AI Media Assembly

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Publishing Target](https://img.shields.io/badge/Target-3amscroll.com-rose)](https://3amscroll.com)
[![Running Cost](https://img.shields.io/badge/Cost-%240%20%2F%20month-emerald)](https://3amscroll.com)

**HIMA (Human + AI Media Assembly)** is an autonomous, high-signal publishing engine designed for **[3AM SCROLL](https://3amscroll.com)**. It spots live cultural and technology trends, drafts longform stories in distinct human columnist voices, scrambles predictable LLM linguistic patterns, pairs editorial visual assets, and publishes directly into the live production database for **$0 / month**.

---

## 🏛️ The 5-Stage Editorial Pipeline

```
[1] Signal Spotting & Angle Refinement
        ↓  (Google Trends US, The Verge, TechCrunch, Ars Technica)
[2] Persona-Driven Drafting
        ↓  (6 authentic writers: Maya, Jax, Priya, Leo, Sofia, Kai)
[3] Anti-AI Linguistic Scrambler
        ↓  (Perplexity & burstiness modulation, cliché purging)
[4] Visual Curation & Technical SEO
        ↓  (Unsplash CDN pool, CTR metadata, slug collision guard)
[5] Quality Verification & Publishing
        ↓  (Checks Human-in-the-Loop gate in Supabase, writes live or draft)
   3AM SCROLL Production Database
```

---

## ✍️ The 6 Columnist Personas

| Columnist | Focus Topics | Tone & Style |
|---|---|---|
| **Maya Chen** | Tech, AI, Startups | Analytical, data-driven, skeptical of corporate hype, sharp verdicts |
| **Jax Rivera** | Culture, Gaming, Entertainment | Gen Z casual, meme-aware, punchy paragraphs, late-night FaceTime call rhythm |
| **Priya Sharma** | Wellness, Health, Lifestyle | Warm & story-led, deconstructing hustle burnout, realistic takeaways |
| **Leo Okonkwo** | Hustle, Business, Economy | Bold & contrarian takes, calling out corporate and economic theatrics |
| **Sofia Martinez** | Planet, Science, Investigative | Deep context, evidence-based, scientific nuance, zero superficial takes |
| **Kai Tanaka** | Emerging Tech, Society, Futurism | Big-picture visionary, trend-forward, grounded speculative vectors |

---

## 🛡️ Human-in-the-Loop (HITL) Gate

HIMA connects directly to the **3AM SCROLL Admin Panel** (`https://3amscroll.com/admin`):

- **Active Safeguard (ON)**: When you toggle HITL ON in your Admin Panel, HIMA automatically forces all incoming generated articles to save as **Drafts** for your editorial review.
- **Autonomous Mode (OFF)**: HIMA bypasses review and publishes directly to the live website on its scheduled interval.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** v20+ or v24+
- A free **Google Gemini API Key** (from [Google AI Studio](https://aistudio.google.com/))
- **3AM SCROLL Supabase Credentials**

### 2. Installation
```bash
git clone https://github.com/anubhavbaghel/HIMA.git
cd HIMA

npm install
```

### 3. Configure Credentials
Copy `.env.example` to `.env.local` and add your keys:
```bash
cp .env.example .env.local
```

```env
GOOGLE_GEMINI_API_KEY=your_gemini_api_key
NEXT_PUBLIC_SUPABASE_URL=https://aczdhnvshvqvwgtiqddr.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_BASE_URL=https://3amscroll.com
```

---

## 💻 How to Run

### Method A: One-Click Windows Launcher (Recommended)
Double-click **`run.bat`** (or execute `.\run.bat` in CMD / PowerShell).  
It opens the interactive Studio Menu with auto-pause crash protection:

```
╔══════════════════════════════════════════════════════════════════════╗
║   3AM SCROLL — HIMA LOCAL PUBLISHING STUDIO                         ║
║   Human + AI Media Assembly Pipeline Running on Your PC              ║
╚══════════════════════════════════════════════════════════════════════╝

Select an option:
  1) 📝 Enter custom topic idea
  2) 📡 Auto-spot from live Google Trends & RSS feeds
  3) 🔄 Start continuous auto-publisher (loops every N hours)
  4) 🧪 Run a Dry-Run test (generates without publishing)
  5) ❌ Exit
```

### Method B: Autonomous 24/7 Background Daemon
Run HIMA continuously while your PC is on. It will pull fresh signals from Google Trends and publish on your schedule:
```bash
# Publish every 3 hours (default):
node src/hima.mjs --continuous --interval 3h

# Or publish as review drafts:
node src/hima.mjs --continuous --interval 4h --draft
```

### Method C: Headless CLI Flags
```bash
# Publish a specific topic live:
node src/hima.mjs --topic "Why Gen Z is ditching dating apps for running clubs"

# Save as review draft:
node src/hima.mjs --topic "The death of open web" --draft

# Fast Dry-Run test (tests all 5 stages without database writes):
node src/hima.mjs --dry-run
```

---

## 📦 Compiling Standalone Windows Executable (`hima.exe`)

You can compile HIMA into a zero-dependency, self-contained Windows executable:
```bash
npm run build:exe
```
This generates **`hima.exe`** (~60MB Single Executable Application). You can double-click `hima.exe` directly on any Windows PC without needing Node.js installed.

---

## 💰 Zero-Cost Architecture ($0 / Month)

| Component | Provider | Tier / Cost |
|---|---|---|
| **AI Generation** | Google Gemini API (`gemini-3.5-flash`) | Free Tier ($0) |
| **Database & Auth** | Supabase Postgres | Free Tier ($0) |
| **Publishing Target** | [3amscroll.com](https://3amscroll.com) | Free Tier ($0) |
| **Compute Execution** | Local PC Studio / Executable | Local ($0) |
| **Total Monthly Cost** | | **$0.00** |

---

## 📄 License

MIT © [3AM SCROLL](https://3amscroll.com)
