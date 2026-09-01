from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    phone = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, default="")
    role = Column(String, default="citizen")
    department = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

class OTP(Base):
    __tablename__ = "otps"
    id = Column(Integer, primary_key=True)
    phone = Column(String, index=True, nullable=False)
    code = Column(String, nullable=False)
    expires_at = Column(DateTime, nullable=False)

class Report(Base):
    __tablename__ = "reports"
    id = Column(Integer, primary_key=True)
    citizen_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String, default="Other")
    priority = Column(String, default="Medium")
    authority = Column(String, default="Municipal Corporation")
    status = Column(String, default="Received")
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    media_url = Column(String, default="")
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolution_notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

class StatusUpdate(Base):
    __tablename__ = "status_updates"
    id = Column(Integer, primary_key=True)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)
    status = Column(String, nullable=False)
    note = Column(Text, default="")
    actor_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
