<div align="center">

# accurova-card

**A digital business card / landing page for Accurova, scanned mostly via QR code off a physical card.**

</div>

---

## What it does

A single mobile-first page (`public/index.html`) with the Accurova logo, a headshot/name intro, business rating, award/press badges, a hero shot strip, a testimonial, a soft-sell card for corporate event photography with a "Request a Quote" CTA to WhatsApp plus a `tel:` fallback, and a contact grid (WhatsApp, Portfolio, LinkedIn, Save Contact vCard, Instagram).

Served by a small FastAPI app (`app/main.py`) that mounts `public/` as static files and adds two endpoints:

- `POST /api/track` — records a `pageview` or `whatsapp_click` event (no cookies, no personal data — just an event name + timestamp)
- `GET /stats` — HTTP Basic-auth protected page showing pageview/click counts and click-through rate, all-time / 7d / 30d

Data lives in Postgres (Zeabur add-on) — see `app/db.py`.

## Placeholders to replace

A few things are currently placeholders, marked with `<!-- PLACEHOLDER -->` comments in `public/index.html`:

- **Headshot** — swap `.avatar-placeholder` for `<img src="assets/headshot.jpg" ...>`
- **Hero shots** — swap each `.hero-thumb`'s contents for `<img src="assets/hero-event.jpg" loading="lazy" ...>` (and `hero-portrait.jpg` / `hero-product.jpg`)
- **Testimonial** — replace the placeholder quote/attribution with a real one
- **Instagram** — the contact-grid tile links to `#` until the real handle is confirmed

## Local preview

```
cp .env.example .env   # fill in a real DATABASE_URL
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8080
```

## Deploy

Builds via the included `Dockerfile` (Python 3.12 + uvicorn). Deployed on Zeabur, with a Postgres add-on providing `DATABASE_URL`. GitHub → Zeabur, `main` triggers the deploy; changes flow `feature/* → dev → main`.
