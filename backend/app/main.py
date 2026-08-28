import os
from dotenv import load_dotenv
load_dotenv()
from datetime import datetime
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy.orm import Session
from .database import Base, engine, get_db
from .models import User, OTP, Report, StatusUpdate
from .schemas import OTPRequest, OTPVerify, ReportCreate, ReportUpdate
from .sms import send_otp
from .ai_engine import analyze, duplicate_score
import shutil, uuid

Base.metadata.create_all(bind=engine)
app = FastAPI(title="CivicConnect AI API")

app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

origins = [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "https://sih-civic-ai-frontend.onrender.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

@app.get("/api/health")
def health():
    return {"ok": True, "service": "CivicConnect AI", "time": datetime.utcnow().isoformat()}

@app.post("/api/auth/request-otp")
def request_otp(data: OTPRequest, db: Session = Depends(get_db)):
    if data.role not in ("citizen", "authority"):
        raise HTTPException(400, "Invalid role")
    result = send_otp(db, data.phone)
    response = {"message": "OTP sent", "mode": result.get("mode")}
    if result.get("mode") == "development":
        response["development_otp"] = result.get("otp")
    return response

@app.post("/api/auth/verify")
def verify(data: OTPVerify, db: Session = Depends(get_db)):
    otp = db.query(OTP).filter(OTP.phone == data.phone).order_by(OTP.id.desc()).first()
    if not otp or otp.code != data.code or otp.expires_at < datetime.utcnow():
        raise HTTPException(401, "Invalid or expired OTP")
    user = db.query(User).filter(User.phone == data.phone).first()
    if not user:
        user = User(phone=data.phone, name=data.name or "Citizen", role="citizen")
        db.add(user); db.commit(); db.refresh(user)
    return {"user": {"id": user.id, "phone": user.phone, "name": user.name, "role": user.role, "department": user.department}}

@app.post("/api/reports")
def create_report(data: ReportCreate, citizen_id: int, db: Session = Depends(get_db)):
    user = db.get(User, citizen_id)
    if not user:
        raise HTTPException(401, "User not found")
    ai = analyze(data.description, data.category or "")
    existing = db.query(Report).filter(Report.status != "Resolved").all()
    score, duplicate_id = duplicate_score(data.description, existing)
    report = Report(citizen_id=citizen_id, title=data.title, description=data.description,
                    category=ai["category"], priority=ai["priority"], authority=ai["authority"],
                    latitude=data.latitude, longitude=data.longitude, media_url=data.media_url or "")
    db.add(report); db.commit(); db.refresh(report)
    db.add(StatusUpdate(report_id=report.id, status="Received", note="Report submitted and AI analysis completed.", actor_id=citizen_id))
    db.commit()
    return {"report": serialize_report(report), "ai": ai, "duplicate": {"score": round(score, 2), "report_id": duplicate_id if score >= .72 else None}}

@app.get("/api/notifications")
def notifications(user_id: int, db: Session = Depends(get_db)):
    reports = db.query(Report).filter(Report.citizen_id == user_id).all()
    ids = [r.id for r in reports]
    if not ids:
        return []
    rows = db.query(StatusUpdate).filter(StatusUpdate.report_id.in_(ids)).order_by(StatusUpdate.id.desc()).limit(30).all()
    return [{"report_id": x.report_id, "status": x.status, "message": x.note or f"Report status changed to {x.status}.", "created_at": x.created_at.isoformat()} for x in rows]

@app.get("/api/reports/mine")
def mine(citizen_id: int, db: Session = Depends(get_db)):
    return [serialize_report(r) for r in db.query(Report).filter(Report.citizen_id == citizen_id).order_by(Report.id.desc()).all()]

@app.get("/api/reports/public")
def public_reports(db: Session = Depends(get_db)):
    rows = db.query(Report).order_by(Report.id.desc()).limit(200).all()
    return [serialize_report(r) for r in rows]

@app.get("/api/reports/authority")
def authority_queue(role: str, department: str = "", db: Session = Depends(get_db)):
    q = db.query(Report).filter(Report.status != "Resolved")
    if role != "Super Admin" and department:
        q = q.filter(Report.authority == department)
    return [serialize_report(r) for r in q.order_by(Report.priority.desc(), Report.id.desc()).all()]

@app.patch("/api/reports/{report_id}")
def update_report(report_id: int, data: ReportUpdate, actor_id: int, db: Session = Depends(get_db)):
    r = db.get(Report, report_id)
    actor = db.get(User, actor_id)
    if not r or not actor:
        raise HTTPException(404, "Not found")
    changed = False
    if data.assigned_to is not None:
        r.assigned_to = data.assigned_to; changed = True
    if data.resolution_notes is not None:
        r.resolution_notes = data.resolution_notes; changed = True
    if data.status:
        r.status = data.status
        db.add(StatusUpdate(report_id=r.id, status=data.status, note=data.resolution_notes or "", actor_id=actor_id))
        changed = True
    if changed:
        db.commit(); db.refresh(r)
    return serialize_report(r)

@app.get("/api/reports/{report_id}/timeline")
def timeline(report_id: int, db: Session = Depends(get_db)):
    return [{"status": s.status, "note": s.note, "created_at": s.created_at.isoformat()} for s in db.query(StatusUpdate).filter(StatusUpdate.report_id == report_id).order_by(StatusUpdate.id).all()]

@app.post("/api/upload")
async def upload(file: UploadFile = File(...)):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in {".jpg",".jpeg",".png",".webp",".mp4",".mov",".webm"}:
        raise HTTPException(400, "Unsupported media type")
    name = f"{uuid.uuid4().hex}{ext}"
    path = os.path.join("uploads", name)
    with open(path, "wb") as out:
        shutil.copyfileobj(file.file, out)
    return {"url": f"/uploads/{name}"}

@app.post("/api/dev/seed-authorities")
def seed_authorities(db: Session = Depends(get_db)):
    demo = [
        ("9000000001","System Admin","Super Admin",""),
        ("9000000002","Road Manager","Department Manager","Roads & Engineering Department"),
        ("9000000003","Field Officer","Field Officer","Roads & Engineering Department"),
        ("9000000004","Sanitation Manager","Department Manager","Sanitation Department"),
    ]
    for phone,name,role,dept in demo:
        if not db.query(User).filter(User.phone==phone).first():
            db.add(User(phone=phone,name=name,role=role,department=dept))
    db.commit()
    return {"message":"Demo authority accounts seeded. Use OTP 123456."}

def serialize_report(r):
    return {
        "id": r.id, "title": r.title, "description": r.description, "category": r.category,
        "priority": r.priority, "authority": r.authority, "status": r.status,
        "latitude": r.latitude, "longitude": r.longitude, "media_url": r.media_url,
        "assigned_to": r.assigned_to, "resolution_notes": r.resolution_notes,
        "created_at": r.created_at.isoformat()
    }
@app.put("/api/reports/{report_id}/assign")
def assign_report(
    report_id: int,
    officer_id: int,
    actor_id: int,
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(
        Report.id == report_id
    ).first()

    if not report:
        raise HTTPException(
            status_code=404,
            detail="Report not found"
        )

    officer = db.query(User).filter(
        User.id == officer_id
    ).first()

    if not officer:
        raise HTTPException(
            status_code=404,
            detail="Officer not found"
        )

    report.assigned_to = officer_id
    report.status = "Assigned"

    db.add(
        StatusUpdate(
            report_id=report.id,
            status="Assigned",
            note=f"Report assigned to officer #{officer_id}",
            actor_id=actor_id
        )
    )

    db.commit()
    db.refresh(report)

    return {
        "message": "Report assigned successfully",
        "report": serialize_report(report)
    }


@app.put("/api/reports/{report_id}/status")
def update_report_status(
    report_id: int,
    status: str,
    actor_id: int,
    note: str = "",
    db: Session = Depends(get_db)
):
    allowed_statuses = [
        "Received",
        "Assigned",
        "In Progress",
        "Resolved"
    ]

    if status not in allowed_statuses:
        raise HTTPException(
            status_code=400,
            detail="Invalid status"
        )

    report = db.query(Report).filter(
        Report.id == report_id
    ).first()

    if not report:
        raise HTTPException(
            status_code=404,
            detail="Report not found"
        )

    report.status = status

    if note:
        report.resolution_notes = note

    db.add(
        StatusUpdate(
            report_id=report.id,
            status=status,
            note=note or f"Status changed to {status}",
            actor_id=actor_id
        )
    )

    db.commit()
    db.refresh(report)

    return {
        "message": "Status updated successfully",
        "report": serialize_report(report)
    }


@app.put("/api/reports/{report_id}/resolution")
def add_resolution_note(
    report_id: int,
    note: str,
    actor_id: int,
    db: Session = Depends(get_db)
):
    report = db.query(Report).filter(
        Report.id == report_id
    ).first()

    if not report:
        raise HTTPException(
            status_code=404,
            detail="Report not found"
        )

    report.resolution_notes = note

    db.add(
        StatusUpdate(
            report_id=report.id,
            status=report.status,
            note=note,
            actor_id=actor_id
        )
    )

    db.commit()
    db.refresh(report)

    return {
        "message": "Resolution note saved",
        "report": serialize_report(report)
    }