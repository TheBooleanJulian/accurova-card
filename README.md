<div align="center">

# accurova-card

**A digital business card / landing page for Accurova, scanned mostly via QR code off a physical card.**

![Python](https://img.shields.io/badge/-Python-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/-FastAPI-009688?logo=fastapi&logoColor=white)
![License](https://img.shields.io/badge/license-AGPLv3%20%2B%20Commercial-00D4C8.svg)

</div>

---

## What it does

A single mobile-first page (`public/index.html`) with the Accurova logo, a headshot/name intro, business rating, award/press badges, a hero shot strip, a testimonial carousel, a soft-sell card for corporate event photography with a "Request a Quote" CTA to WhatsApp plus a `tel:` fallback, and a contact grid (WhatsApp, Portfolio, LinkedIn, Save Contact vCard, Instagram).

Served by a small FastAPI app (`app/main.py`) that mounts `public/` as static files and adds two endpoints:

- `POST /api/track` — records a `pageview` or `whatsapp_click` event (no cookies, no personal data — just an event name + timestamp)
- `GET /stats` — HTTP Basic-auth protected page showing pageview/click counts and click-through rate, all-time / 7d / 30d

Production runs on a Cloudflare Worker (`worker.js`); data lives in the `accurova_card` schema of the shared Supabase
project (migration in `thebooleanjulian-db`). `app/` is the original FastAPI version, kept for local runs.

## Features

- Mobile-first digital business card with logo, intro, ratings, and award/press badges
- Hero shot strip (event / portrait / product) and a testimonial carousel
- Corporate event photography soft-sell card with a WhatsApp "Request a Quote" CTA and `tel:` fallback
- Contact grid: WhatsApp, Portfolio, LinkedIn, Save Contact (vCard), Instagram
- Privacy-light analytics — pageview and WhatsApp-click counters with no cookies or personal data
- HTTP Basic-auth protected `/stats` dashboard (all-time / 7d / 30d)
- No-store cache headers on HTML/CSS/vCard responses so edits show up immediately

## Tech Stack

| Layer | Choice |
|---|---|
| Backend (production) | Cloudflare Worker (`worker.js`), Postgres via Hyperdrive + `thebooleanjulian-bot-core/db` |
| Backend (local) | FastAPI (Python 3.12) served by Uvicorn (`app/`) |
| Frontend | Static HTML/CSS in `public/` (`public/_headers` sets no-store) |
| Database | Supabase Postgres, schema `accurova_card` |
| Deployment | Cloudflare Workers (`wrangler.jsonc`) |

## Screenshots

_Screenshots coming soon._ Some imagery on the live card (headshot, hero shots) was pulled from accurova.com's existing site assets and is flagged with `PLACEHOLDER` comments in `public/index.html` pending dedicated photography.

## Setup / Quick Start

```bash
git clone https://github.com/TheBooleanJulian/accurova-card
cd accurova-card
cp .env.example .env   # fill in a real DATABASE_URL
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

## Deploy

`npm install && npx wrangler deploy`. Secrets: `STATS_USERNAME`, `STATS_PASSWORD` (`npx wrangler secret put …`; no
defaults, so `/stats` stays locked until both are set). The Hyperdrive binding and the `card.accurova.com` route are in
`wrangler.jsonc`. Tests: `npm test`. Changes flow `feature/* → dev → main`.

## Status / Roadmap

- [x] Static card page with logo, intro, badges, and contact grid
- [x] FastAPI backend with Postgres-backed analytics and a protected `/stats` page
- [x] Testimonial carousel, tel: fallback, and confirmed Instagram link
- [ ] Replace accurova.com-sourced hero/headshot images with dedicated photography

## Changelog

- **2026-11-03** — Moved off Zeabur: Cloudflare Worker + Supabase schema `accurova_card`; same endpoints and stats page, no default stats credentials
- **2026-08-23** — Filled headshot and hero-strip placeholders from accurova.com; added testimonial carousel and confirmed Instagram link
- **2026-08-17** — Initial release: FastAPI-served digital business card with logo, badges, analytics tracking, and a protected stats page

## License

This project is dual licensed.

- Community Edition — [GNU Affero General Public License v3 (AGPLv3)](LICENSE). Free to use, modify, and self-host. If you distribute a modified version or run it as a network service, you must make the corresponding source available.
- Commercial License — for organisations that want to embed, modify, or distribute this software without AGPLv3's obligations. See [COMMERCIAL-LICENSE.md](COMMERCIAL-LICENSE.md).

---

<div align="center">
<sub>Built by <a href="https://github.com/TheBooleanJulian">@TheBooleanJulian</a></sub>
</div>
