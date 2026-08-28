from pydantic import BaseModel
from typing import Optional

class OTPRequest(BaseModel):
    phone: str
    role: str = "citizen"

class OTPVerify(BaseModel):
    phone: str
    code: str
    name: str = ""

class ReportCreate(BaseModel):
    title: str
    description: str
    category: Optional[str] = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    media_url: Optional[str] = ""

class ReportUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[int] = None
    resolution_notes: Optional[str] = None
