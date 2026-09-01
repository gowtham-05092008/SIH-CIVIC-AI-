import re
from difflib import SequenceMatcher

CATEGORY_KEYWORDS = {
    "Road & Potholes": ["pothole", "road", "street", "asphalt", "crack", "traffic"],
    "Streetlight": ["streetlight", "street light", "lamp", "dark", "light pole"],
    "Garbage & Sanitation": ["garbage", "trash", "waste", "dump", "dirty", "sewage", "drain"],
    "Water Supply": ["water", "pipeline", "leak", "drinking water", "tap"],
    "Public Safety": ["accident", "danger", "unsafe", "fire", "open manhole", "fallen"],
    "Parks & Public Spaces": ["park", "playground", "tree", "bench"],
}

AUTHORITY_MAP = {
    "Road & Potholes": "Roads & Engineering Department",
    "Streetlight": "Electrical / Streetlight Department",
    "Garbage & Sanitation": "Sanitation Department",
    "Water Supply": "Water Works Department",
    "Public Safety": "Emergency / Public Safety Department",
    "Parks & Public Spaces": "Parks Department",
}

def analyze(text: str, requested_category: str = ""):
    t = text.lower()
    scores = {k: sum(1 for word in words if word in t) for k, words in CATEGORY_KEYWORDS.items()}
    category = max(scores, key=scores.get) if max(scores.values(), default=0) else "Other"
    if requested_category and requested_category != "Auto":
        category = requested_category

    critical = ["fire", "accident", "open manhole", "electric shock", "collapsed", "dangerous"]
    high = ["major", "flood", "blocked road", "sewage", "no water", "fallen tree"]
    if any(x in t for x in critical):
        priority = "Critical"
    elif any(x in t for x in high):
        priority = "High"
    elif len(t) > 180:
        priority = "Medium"
    else:
        priority = "Low"

    authority = AUTHORITY_MAP.get(category, "Municipal Corporation")
    return {"category": category, "priority": priority, "authority": authority}

def duplicate_score(description, existing):
    best = 0
    best_id = None
    for r in existing:
        score = SequenceMatcher(None, description.lower(), r.description.lower()).ratio()
        if score > best:
            best, best_id = score, r.id
    return best, best_id
