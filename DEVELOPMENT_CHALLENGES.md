# Development Challenges and Solutions

## Project: Airline Demand Analytics App

This document outlines the various challenges encountered during the development of the airline demand analytics application and the solutions implemented to overcome them.

---

## 1. **Project Architecture & Structure**

### Problem
- Initially had a monolithic structure with scraping logic mixed with backend analytics
- Unclear separation of concerns between data collection, processing, and presentation
- Difficulty in maintaining and scaling individual components

### Solution
- Implemented clean separation with three distinct modules:
  - `scraper/` - Standalone Playwright-based flight scraping
  - `backend/` - FastAPI analytics and AI insights API
  - `frontend/` - Static dashboard with modern UI
- Each component can be developed, tested, and deployed independently

---

## 2. **File Path Management & CSV Output Location**

### Problem
- Scraper was writing CSV files to inconsistent locations
- Backend couldn't reliably find the generated CSV files
- Path resolution issues between relative and absolute paths
- "Scraping failed" errors due to file location mismatches

### Solution
- **Forced CSV Output Location**: Modified scraper to always write to `scraper/csv_output/` regardless of user input
- **Absolute Path Resolution**: Backend uses absolute paths to locate scraper and CSV files
- **Consistent Filename**: Backend forces filename to `flight_data.csv` to avoid confusion
- **Directory Creation**: Automatic creation of output directories if they don't exist

```python
# Backend ensures consistent paths
scraper_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../scraper/flight_scraper.py'))
output_path = os.path.abspath(os.path.join(os.path.dirname(__file__), f"../../scraper/csv_output/{forced_filename}"))
```

---

## 3. **Data Serialization & JSON Compatibility**

### Problem
- Python `float` values like `NaN`, `inf`, and `-inf` cannot be serialized to JSON
- FastAPI was crashing when trying to return analytics containing these values
- Pandas operations often generate NaN values in aggregations

### Solution
- Implemented `safe_for_json()` function to sanitize all data before API responses
- Recursive cleaning of nested dictionaries and lists
- Conversion of problematic float values to `None`

```python
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
```

---

## 4. **AI Integration & API Management**

### Problem
- Google Gemini API integration required proper error handling
- API key management and environment variable loading
- Inconsistent AI response formatting
- Need for actionable insights rather than generic analysis

### Solution
- **Environment Variables**: Used `python-dotenv` for secure API key management
- **Robust Error Handling**: Comprehensive try-catch blocks for API failures
- **Markdown Output**: Structured AI responses in markdown for rich formatting
- **Tuned Prompts**: Customized prompts for airline-specific insights (demand trends, price analysis, route optimization)

```python
# Tuned AI prompt for actionable insights
prompt = f"""
Analyze this flight data and provide actionable business insights in markdown format.
Focus on:
1. **Demand Trends**: Peak travel days, seasonal patterns
2. **Price Optimization**: Competitive pricing insights
3. **Route Performance**: Most/least popular routes
4. **Operational Insights**: CO2 efficiency, aircraft utilization

Data summary: {summary}
"""
```

---

## 5. **Frontend Design & User Experience**

### Problem
- Initial design used emojis and basic styling (not professional)
- Inconsistent loading states and error handling
- Poor visual hierarchy and information density
- Lack of industry-standard design patterns

### Solution
- **Professional Icon System**: Replaced emojis with FontAwesome icons
- **Modern Card Layout**: Implemented enterprise-grade card-based design
- **Comprehensive Loading States**: Added spinners and status indicators throughout
- **Responsive Design**: Ensured compatibility across all screen sizes
- **Color Scheme**: Adopted professional color palette (grays, blues, whites)

### Before vs After
```html
<!-- Before: Basic emoji-based design -->
<span>✈️</span> Airline Demand Analytics Dashboard

<!-- After: Professional icon-based design -->
<div class="bg-blue-600 p-2 rounded-lg">
  <i class="fas fa-plane text-white text-xl"></i>
</div>
<h1 class="text-xl font-bold text-gray-900">Airline Analytics</h1>
```

---

## 6. **Data Processing & Analytics Pipeline**

### Problem
- Raw CSV data needed extensive cleaning and parsing
- Price and duration values were in string format with currency symbols
- CO2 emissions data was inconsistent and contained non-numeric characters
- Need for meaningful analytics beyond basic aggregations

### Solution
- **Robust Parsing Functions**: Created dedicated parsers for price, duration, and CO2 data
- **Data Validation**: Added checks for missing or malformed data
- **Enhanced Analytics**: Implemented multiple analysis dimensions:
  - Price distribution and trends
  - Airline performance metrics
  - Route popularity analysis
  - Environmental impact assessment

```python
def parse_price(price_str):
    # Remove currency symbols and commas, convert to float
    return float(re.sub(r'[^\d.]', '', str(price_str)))

def parse_duration(duration_str):
    # Convert '1 hr 25 min' to minutes
    match = re.match(r'(\d+) hr(?: (\d+) min)?', duration_str)
    if match:
        hours = int(match.group(1))
        minutes = int(match.group(2) or 0)
        return hours * 60 + minutes
```

---

## 7. **Web Scraping Reliability**

### Problem
- Google Flights has dynamic content loading
- Need for headless browsing for deployment
- Selector changes could break scraping
- Rate limiting and anti-bot measures

### Solution
- **Playwright Integration**: Used Playwright for reliable browser automation
- **Headless Mode**: Always run scraper in headless mode for server deployment
- **Robust Selectors**: Used multiple selector strategies with fallbacks
- **Wait Strategies**: Implemented proper waiting for dynamic content

```python
# Robust element extraction with fallbacks
async def extract_flight_element_text(flight, selector: str, aria_label: Optional[str] = None) -> str:
    if aria_label:
        element = await flight.query_selector(f'{selector}[aria-label*="{aria_label}"]')
    else:
        element = await flight.query_selector(selector)
    return await element.inner_text() if element else "N/A"
```

---

## 8. **Chart Visualization & Data Presentation**

### Problem
- Need for multiple chart types to represent different data dimensions
- Chart.js integration and responsive design
- Proper data binning for histograms
- Color coordination and visual consistency

### Solution
- **Multiple Chart Types**: Implemented bar charts, pie charts, line charts, and histograms
- **Responsive Charts**: All charts adapt to container sizes
- **Professional Color Schemes**: Consistent color palette across all visualizations
- **Interactive Elements**: Hover effects and proper legends

---

## 9. **API Design & Error Handling**

### Problem
- Need for clean REST API design
- Proper error responses and status codes
- CORS configuration for frontend-backend communication
- Timeout handling for long-running scraping operations

### Solution
- **RESTful Endpoints**: Clean API design with `/api/analyze`, `/api/scrape`, `/api/ai-insight`
- **Proper HTTP Status Codes**: 200 for success, 500 for errors with detailed messages
- **CORS Middleware**: Configured to allow frontend access
- **Timeout Management**: 10-minute timeout for scraping operations

---

## 10. **Development Workflow & Documentation**

### Problem
- Need for clear setup instructions
- Dependency management across different components
- Git workflow and commit message standards
- Project documentation and README

### Solution
- **Comprehensive README**: Detailed setup, usage, and customization instructions
- **Requirements Management**: Centralized `requirements.txt` with all dependencies
- **Environment Setup**: Clear `.env` configuration instructions
- **Professional Documentation**: Industry-standard markdown documentation

---

## 11. **Performance & Scalability Considerations**

### Problem
- Large datasets could slow down frontend rendering
- Memory usage during data processing
- Chart rendering performance with many data points

### Solution
- **Data Pagination**: Limited table displays with "top N" approach
- **Efficient Data Structures**: Used appropriate pandas operations for large datasets
- **Chart Optimization**: Reasonable data point limits for chart performance
- **Lazy Loading**: Charts and tables render only when data is available

---

## Key Learnings

1. **Separation of Concerns**: Clean architecture pays dividends in maintainability
2. **Error Handling**: Comprehensive error handling at every level prevents cascading failures
3. **Data Validation**: Never trust external data - always validate and sanitize
4. **User Experience**: Professional UI design significantly impacts perceived quality
5. **Documentation**: Good documentation is essential for project adoption and maintenance

---

## Future Improvements

- [ ] Real-time scraping progress with WebSocket connections
- [ ] Database integration for historical data storage
- [ ] Advanced filtering and search capabilities
- [ ] Export functionality for reports and data
- [ ] Mobile-responsive design optimizations
- [ ] Performance monitoring and analytics
- [ ] Automated testing suite
- [ ] Docker containerization for easy deployment

---

*This document serves as a reference for future development and helps new contributors understand the architectural decisions and challenges overcome during the project development.*
