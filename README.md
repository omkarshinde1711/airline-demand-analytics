# Airline Demand Analytics App

A modern, full-stack airline demand analytics dashboard with real-time scraping, backend analytics, and a visually appealing frontend.

## Features

- **Flight Scraper**: Standalone Playwright-based scraper for Google Flights. Scrapes flights for a city/date range and outputs to CSV.
- **Backend Analytics**: FastAPI backend analyzes CSV data, provides analytics and AI insights via API endpoints.
- **AI Insights**: Integrates with Google Gemini API for actionable, markdown-formatted insights (demand trends, price trends, popular routes).
- **Frontend Dashboard**: Modern UI (Tailwind, Chart.js) with advanced tables, infographics, and markdown-rendered AI insights.
- **Real-time Progress**: (Planned) Real-time scraping progress updates.

## Project Structure

```
backend/    # FastAPI backend, analytics, AI
scraper/    # Playwright scraper, CSV output
frontend/   # Static dashboard (index.html, script.js)
.env        # API keys and config
requirements.txt
```

## Quickstart

### 1. Install dependencies

- Python 3.9+
- Node.js (for frontend dev, optional)
- Install Python packages:
  ```
  pip install -r requirements.txt
  ```
- Install Playwright browsers:
  ```
  playwright install
  ```

### 2. Set up environment variables

Create a `.env` file in the root with your Gemini API key:
```
GEMINI_API_KEY=your_google_gemini_api_key
```

### 3. Run the backend

```
cd backend
uvicorn main:app --reload
```

### 4. Run the scraper (standalone)

```
cd scraper
python flight_scraper.py SFO LAX 2025-07-10 2025-07-12 --filename flight_data.csv
```

### 5. Open the frontend

Open `frontend/index.html` in your browser. The dashboard will fetch analytics from the backend.

## Usage

- Enter origin, destination, and date range in the dashboard, then click "Scrape".
- View analytics, tables, and AI insights.
- Click "Get AI Insight" for fresh AI-generated markdown insights.

## Customization

- Add new analytics or plots in `backend/processor.py` and update the frontend as needed.
- Tweak AI prompts in `backend/ai_insights.py`.

## Contributing

Pull requests welcome! For major changes, open an issue first.

## License

MIT
