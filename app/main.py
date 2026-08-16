import secrets
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.db import get_stats, init_db, record_event

app = FastAPI(title="Accurova Card", docs_url=None, redoc_url=None)

PUBLIC_DIR = Path(__file__).resolve().parent.parent / "public"

ALLOWED_EVENTS = {"pageview", "whatsapp_click"}

security = HTTPBasic()


@app.on_event("startup")
def _startup() -> None:
    init_db()


def _require_stats_auth(credentials: HTTPBasicCredentials = Depends(security)) -> None:
    user_ok = secrets.compare_digest(credentials.username, settings.STATS_USERNAME)
    pass_ok = secrets.compare_digest(credentials.password, settings.STATS_PASSWORD)
    if not (user_ok and pass_ok):
        raise HTTPException(status_code=401, detail="Unauthorized", headers={"WWW-Authenticate": "Basic"})


@app.post("/api/track")
async def track(request: Request) -> JSONResponse:
    payload = await request.json()
    event = payload.get("event")
    if event not in ALLOWED_EVENTS:
        raise HTTPException(status_code=400, detail="Unknown event")
    record_event(event)
    return JSONResponse({"ok": True})


@app.get("/stats", response_class=HTMLResponse)
def stats(_: None = Depends(_require_stats_auth)) -> str:
    data = get_stats()

    def row(label: str) -> str:
        all_time = data["all_time"].get(label, 0)
        last_7d = data["last_7d"].get(label, 0)
        last_30d = data["last_30d"].get(label, 0)
        return f"<tr><td>{label}</td><td>{all_time}</td><td>{last_7d}</td><td>{last_30d}</td></tr>"

    pageviews_all = data["all_time"].get("pageview", 0)
    clicks_all = data["all_time"].get("whatsapp_click", 0)
    ctr = (clicks_all / pageviews_all * 100) if pageviews_all else 0

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>accurova-card stats</title>
<style>
body {{ font-family: -apple-system, sans-serif; max-width: 560px; margin: 40px auto; padding: 0 16px; color: #0b0d12; }}
table {{ width: 100%; border-collapse: collapse; margin: 16px 0; }}
th, td {{ text-align: left; padding: 8px; border-bottom: 1px solid #e5e7eb; }}
h1 {{ font-size: 18px; }}
.ctr {{ font-size: 13px; color: #4b5563; }}
</style>
</head>
<body>
<h1>card.accurova.com — stats</h1>
<table>
<tr><th>Event</th><th>All time</th><th>Last 7d</th><th>Last 30d</th></tr>
{row("pageview")}
{row("whatsapp_click")}
</table>
<p class="ctr">WhatsApp click-through rate (all time): {ctr:.1f}%</p>
</body>
</html>"""


app.mount("/", StaticFiles(directory=str(PUBLIC_DIR), html=True), name="public")
