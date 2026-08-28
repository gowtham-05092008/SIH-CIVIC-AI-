# CivicConnect AI

A deployable MVP for 24/7 civic issue reporting and authority resolution.

## Included
- Citizen phone + OTP authentication (development OTP shown in UI)
- Photo/video upload
- Description + category
- Automatic browser geolocation
- AI-style categorization, priority, duplicate detection and authority suggestion
- Citizen report history and status timeline
- Public nearby issue map/feed using OpenStreetMap + Leaflet
- Authority login with phone + OTP
- Roles: Super Admin, Department Manager, Field Officer
- Authority queues, assignment, status updates and resolution notes
- Browser push-style notifications via WebSocket
- Twilio production OTP integration through environment variables
- SQLite for local development; easy PostgreSQL switch later

## Run locally

### Backend
```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173

## Development OTP
Use OTP `123456` for the built-in development flow. The API also returns a development OTP when SMS is not configured.

## Production Twilio OTP
Set:
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_FROM_NUMBER

Then set `USE_TWILIO=true`.

For production, replace SQLite with PostgreSQL, put the API behind HTTPS, configure CORS, and deploy frontend/backend on always-on services.

## Map
The app uses OpenStreetMap tiles through Leaflet. Follow OpenStreetMap tile usage policy and use a suitable tile provider for production scale.

## Important
The included "AI engine" is deliberately dependency-light so the project runs immediately. It uses explainable keyword/rule scoring for categorization, priority, duplicates and authority routing. Replace `ai_engine.py` with an LLM/vision model when API credentials and a production model are selected.


## Free college/demo mode

The default configuration uses `DEVELOPMENT_MODE=true` and `USE_TWILIO=false`.

- OTP is always `123456`
- No SMS provider or payment is required
- The OTP is shown in the login screen
- Citizens receive in-app status notifications
- Later, switch to Twilio Verify by setting `DEVELOPMENT_MODE=false`, `USE_TWILIO=true`, and `TWILIO_VERIFY_SERVICE_SID`.
