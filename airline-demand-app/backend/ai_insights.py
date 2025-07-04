import os
import requests
import pandas as pd
from dotenv import load_dotenv

load_dotenv()

GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"

def get_ai_insights_from_csv(csv_path, max_rows=200):
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return "Gemini API key not set."
    try:
        abs_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', csv_path))
        df = pd.read_csv(abs_path, nrows=max_rows)
        csv_content = df.to_csv(index=False)
    except Exception as e:
        return f"CSV read error: {e}"
    prompt = (
        "You are an expert airline data analyst. Analyze the following airline flight CSV data and provide:\n"
        "1. Three insightful bullet points (in markdown, with bolded keywords) about demand trends, pricing changes, and popular routes.\n"
        "2. A markdown table summarizing the top 3 airlines by average price (columns: Airline, Avg Price).\n"
        "Respond in markdown format only.\n\n"
        + csv_content
    )
    headers = {
        "Content-Type": "application/json",
        "X-goog-api-key": api_key
    }
    data = {
        "contents": [
            {"parts": [
                {"text": prompt}
            ]}
        ]
    }
    try:
        resp = requests.post(GEMINI_API_URL, headers=headers, json=data, timeout=60)
        resp.raise_for_status()
        result = resp.json()
        candidates = result.get("candidates", [])
        if candidates and "content" in candidates[0] and "parts" in candidates[0]["content"]:
            return candidates[0]["content"]["parts"][0]["text"]
        return f"AI did not return a valid response: {result}"
    except Exception as e:
        return f"AI insight error: {e}"
#Debug- HERE!!!
#if __name__ == "__main__":
#    print(get_ai_insights_from_csv('scraper/csv_output/flight_data.csv'))
