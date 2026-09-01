import os, random
from datetime import datetime, timedelta
from .models import OTP

def send_otp(db, phone: str):
    development = os.getenv("DEVELOPMENT_MODE", "false").lower() == "true"
    use_twilio = os.getenv("USE_TWILIO", "false").lower() == "true"

    if development and not use_twilio:
        code = (os.getenv("DEV_OTP") or f"{random.randint(100000, 999999)}").strip()
        otp = OTP(phone=phone, code=code, expires_at=datetime.utcnow() + timedelta(minutes=5))
        db.add(otp)
        db.commit()
        return {"mode": "development", "otp": code}

    if not use_twilio:
        raise RuntimeError("No OTP delivery backend configured. Set USE_TWILIO=true and configure Twilio credentials.")

    from twilio.rest import Client
    service_sid = os.getenv("TWILIO_VERIFY_SERVICE_SID")
    client = Client(os.getenv("TWILIO_ACCOUNT_SID"), os.getenv("TWILIO_AUTH_TOKEN"))
    verification = client.verify.v2.services(service_sid).verifications.create(
        to=phone, channel="sms"
    )
    return {"mode": "twilio", "status": verification.status}
