# Production deployment checklist

## 1. Backend
Deploy the FastAPI container on an always-on service with HTTPS.

Environment:
- USE_TWILIO=true
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN
- TWILIO_FROM_NUMBER
- DATABASE_URL
- FRONTEND_ORIGIN
- JWT_SECRET

## 2. Database
Use managed PostgreSQL in production. Run database migrations before release.

## 3. Frontend
Build with:
npm ci
npm run build

Serve `dist/` from a CDN/static host and set the production API base URL.

## 4. SMS
Create and verify your Twilio sender and comply with local SMS registration rules. Never commit credentials.

## 5. Map
OpenStreetMap tiles are suitable for development. For production traffic, use an appropriate OSM tile provider or your own tile infrastructure and follow its usage policy.

## 6. Push
The service worker is included. For real browser push, add VAPID/Web Push credentials and persist subscriptions per user/device.

## 7. Security
- HTTPS everywhere
- Long random JWT_SECRET
- Rate-limit OTP requests
- Limit OTP attempts
- Validate media size/type
- Virus-scan uploaded files
- Store media in object storage
- Use PostgreSQL backups
- Add audit logging
- Restrict CORS to the real frontend origin
- Do not expose development OTPs in production
