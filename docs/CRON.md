# Scheduled jobs (cron)

Set a strong secret in `.env.local`:

```env
CRON_SECRET=your-long-random-secret-here
```

## Session reminders (1 hour + 15 minutes before mentor sessions)

Runs every **5 minutes**. Sends in-app notifications to mentor and mentee.

### Local / manual test (PowerShell)

```powershell
$secret = "YOUR_CRON_SECRET"
Invoke-WebRequest -Uri "http://localhost:3000/api/cron/session-reminders" -Headers @{ Authorization = "Bearer $secret" } -Method GET
```

### Production URL (replace domain and secret)

```powershell
$secret = "YOUR_CRON_SECRET"
Invoke-WebRequest -Uri "https://YOUR_DOMAIN/api/cron/session-reminders" -Headers @{ Authorization = "Bearer $secret" } -Method GET
```

### curl (Git Bash / Linux / macOS)

```bash
curl -sS -X GET "https://YOUR_DOMAIN/api/cron/session-reminders" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Vercel

`vercel.json` already includes:

```json
{ "path": "/api/cron/session-reminders", "schedule": "*/5 * * * *" }
```

Add `CRON_SECRET` in the Vercel project environment variables.

### Windows Task Scheduler (every 5 minutes)

Program: `powershell.exe`  
Arguments:

```text
-NoProfile -Command "Invoke-WebRequest -Uri 'https://YOUR_DOMAIN/api/cron/session-reminders' -Headers @{ Authorization = 'Bearer YOUR_CRON_SECRET' } -Method GET"
```

### Railway / external cron

Create a cron job with the same GET request every 5 minutes.

## Other crons

| Endpoint | Schedule | Purpose |
|----------|----------|---------|
| `/api/cron/profile-reminder` | Hourly | Profile completion emails |
| `/api/cron/assessment-invite` | Hourly | Delayed assessment invite emails |

Same `Authorization: Bearer CRON_SECRET` header for all.
