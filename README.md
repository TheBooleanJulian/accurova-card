<div align="center">

# accurova-card

**A static digital business card / landing page for Accurova.**

</div>

---

## What it does

A single mobile-first page with the Accurova logo, business rating, award/press badges, a soft-sell card for corporate event photography with a "Request a Quote" CTA to WhatsApp, and a contact grid (WhatsApp, Portfolio, LinkedIn, Save Contact vCard).

No backend, no database — pure static HTML/CSS served by nginx.

## Logo

Drop the logo file in as `assets/accurova-logo.png` (referenced by `index.html`).

## Local preview

Open `index.html` directly in a browser, or serve the folder with any static file server, e.g.:

```
npx serve .
```

## Deploy

Builds via the included `Dockerfile` (nginx:alpine). Deployed on Zeabur.
