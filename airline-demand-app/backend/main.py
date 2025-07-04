from fastapi import FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
import subprocess
import os
import sys
from processor import process_flight_csv
from ai_insights import get_ai_insights_from_csv
from dotenv import load_dotenv
import math
load_dotenv()

app = FastAPI()

# Allow frontend to talk to backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store the latest CSV filename in memory (per server run)
LATEST_CSV_PATH = os.path.join(os.path.dirname(__file__), '../../scraper/csv_output/flight_data.csv')

def get_csv_path():
    return LATEST_CSV_PATH

# Path to the latest CSV generated by the scraper
CSV_PATH = os.path.join(os.path.dirname(__file__), '../../scraper/csv_output/flight_data.csv')

def safe_for_json(obj):
    if isinstance(obj, float):
        if math.isinf(obj) or math.isnan(obj):
            return None
        return obj
    if isinstance(obj, dict):
        return {k: safe_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [safe_for_json(v) for v in obj]
    return obj

@app.get("/api/analyze")
def analyze_flights():
    csv_path = get_csv_path()
    if not os.path.exists(csv_path):
        return {"error": "No flight data available. Please run the scraper first."}
    insights = process_flight_csv(csv_path)
    # Add AI insights
    insights["ai_insights"] = get_ai_insights_from_csv(csv_path)
    # Clean all floats for JSON serialization
    return safe_for_json(insights)

class ScrapeRequest(BaseModel):
    origin: str
    destination: str
    start_date: str
    end_date: str
    filename: str

@app.post("/api/scrape")
def scrape_flights(req: ScrapeRequest):
    global LATEST_CSV_PATH
    # Always use 'flight_data.csv' as the output filename
    forced_filename = 'flight_data.csv'
    scraper_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../scraper/flight_scraper.py'))
    output_path = os.path.abspath(os.path.join(os.path.dirname(__file__), f"../../scraper/csv_output/{forced_filename}"))
    cmd = [sys.executable, scraper_path, req.origin, req.destination, req.start_date, req.end_date, '--filename', forced_filename]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=os.path.dirname(scraper_path), timeout=600)
        if result.returncode != 0:
            return JSONResponse(status_code=500, content={"status": "Scraping failed", "details": result.stderr})
        # Update the latest CSV path for analysis
        LATEST_CSV_PATH = output_path
        return {"status": "Scraping complete!", "details": result.stdout}
    except Exception as e:
        return JSONResponse(status_code=500, content={"status": "Scraping error", "details": str(e)})

@app.get("/api/dashboard")
def dashboard_info():
    """Return basic dashboard information and server status."""
    csv_path = get_csv_path()
    return {
        "status": "online",
        "data_available": os.path.exists(csv_path),
        "csv_path": csv_path,
        "endpoints": ["/api/analyze", "/api/scrape", "/api/ai-insight", "/api/dashboard"]
    }

@app.get("/api/ai-insight")
def ai_insight():
    load_dotenv()  # Force reload .env every call (for debug)
    print("DEBUG: GEMINI_API_KEY =", os.getenv("GEMINI_API_KEY"))
    csv_path = get_csv_path()
    if not os.path.exists(csv_path):
        return {"error": "No flight data available. Please run the scraper first."}
    ai_result = get_ai_insights_from_csv(csv_path)
    return {"ai_insights": ai_result}
