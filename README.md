# BazarBD (বাজারবিডি) – Bangladesh Daily Essential Commodity Price Tracker

> **প্রতিদিনের বাজারদর, হাতের মুঠোয়**
> A comprehensive, real-time daily essential commodity price tracking and monitoring platform for citizens and administrators across Bangladesh.

---

## 1. Project Overview

BazarBD is designed based on the modern, clean layout of **FreshCart**, adapted into a high-utility commodity market intelligence platform. It tracks wholesale and retail market prices across all **8 divisions of Bangladesh** with verified data from:
- **DAM (Department of Agricultural Marketing / কৃষি বিপণন অধিদপ্তর)**: `https://dam.gov.bd/`
- **TCB (Trading Corporation of Bangladesh / ট্রেডিং কর্পোরেশন অব বাংলাদেশ)**: `https://tcb.gov.bd/`
- **Bangladesh National Open Data Portal**: `https://data.gov.bd/`

---

## 2. Key Features

1. **Daily Essential Price Tracking**:
   - 9 Primary staple categories: Vegetables (সবজি), Rice & Grains (চাল ও শস্য), Fish (মাছ), Meat & Poultry (মাংস ও মুরগি), Eggs & Dairy (ডিম ও দুধ), Cooking Oil (তেল), Pulses (ডাল), Fruits (ফল), Spices (মসলা).
   - Real-time price, yesterday's price, percentage change, market high/low price range.
   - Price change indicators (Green = Decreased, Red = Increased, Gray = Stable).

2. **Interactive Historical Price Charts**:
   - 7-Day, 30-Day, 3-Month, 6-Month, and 1-Year price trajectory powered by Recharts.
   - Volatility trends, average price, lowest, and highest records.

3. **Cross-Market Comparison Matrix**:
   - Compare the same commodity between Karwan Bazar, Mohammadpur Krishi Market, Mirpur-1, Jatrabari, Reazuddin Bazar (Chattogram), Shaheb Bazar (Rajshahi), etc.
   - Immediate detection of lowest price market and price spread.

4. **Watchlist & Daily Price Basket**:
   - Track household commodity expenses with calculated daily savings vs previous day.

5. **AI Market Assistant (Gemini / OpenAI API compatible)**:
   - Bengali & English natural language queries (e.g. *"আজকে ঢাকায় আলুর দাম কত?"*, *"কোন পণ্যের দাম বেশি কমেছে?"*).
   - Grounded strictly in database prices with zero hallucinations.

6. **Daily Printable Bulletin & CSV Export**:
   - Official formatted printable daily report with inspector sign-off.
   - One-click CSV export of all active commodity rates.

7. **Admin Control Center (/admin)**:
   - Full Product CRUD (add new items, update names in Bengali & English, update units, images).
   - Price Management: Add today's price, update range, assign markets.
   - Bulk CSV Import: Update 50+ commodity rates at once.
   - Government API sync triggers and execution logs.
   - Supabase SQL schema copy & live connection manager.

---

## 3. Technology Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide Icons, Recharts, Motion.
- **Backend / Database**: Supabase PostgreSQL, Supabase Realtime, Supabase Auth, Storage.
- **AI Engine**: `@google/genai` (with zero-hallucination local search fallback).

---

## 4. Supabase Setup & SQL Schema

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase Dashboard.
3. Paste the contents of `src/services/supabaseSchema.ts` (or copy directly from the **Supabase SQL Schema** tab in BazarBD).
4. Run the script to generate all 18 tables:
   - `profiles`, `roles`, `categories`, `products`, `product_images`, `divisions`, `districts`, `upazilas`, `markets`, `market_prices`, `price_history`, `data_sources`, `api_integrations`, `api_sync_logs`, `price_reports`, `admin_activity_logs`, `notifications`, `website_settings`.
5. Add your credentials to `.env`:
   ```env
   VITE_SUPABASE_URL="https://your-project.supabase.co"
   VITE_SUPABASE_ANON_KEY="your-anon-key-here"
   ```

---

## 5. Deployment Instructions

### Deploy to Vercel:
```bash
npm install -g vercel
vercel
```

### Deploy to Cloudflare Pages:
1. Connect your GitHub repository to Cloudflare Pages.
2. Build command: `npm run build`
3. Build output directory: `dist`

### Local Development:
```bash
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.
"# BAZAR_BD-update-4" 
