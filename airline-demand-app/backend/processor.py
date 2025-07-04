import pandas as pd
import re

def parse_price(price_str):
    """Remove currency symbols and commas, convert to float. Handle empty/invalid data."""
    try:
        cleaned = re.sub(r'[^\d.]', '', str(price_str))
        if not cleaned or cleaned == '.':
            return None
        return float(cleaned)
    except (ValueError, AttributeError):
        return None

def parse_co2(co2_str):
    """Extract numeric value, handle empty or missing values."""
    try:
        s = re.sub(r'[^\d.]', '', str(co2_str))
        if not s or s == '.':
            return None
        return float(s)
    except (ValueError, AttributeError):
        return None

def parse_duration(duration_str):
    """Convert '1 hr 25 min' to minutes. Handle empty/invalid data."""
    try:
        if not isinstance(duration_str, str) or not duration_str.strip():
            return None
        match = re.match(r'(\d+) hr(?: (\d+) min)?', duration_str)
        if match:
            hours = int(match.group(1))
            minutes = int(match.group(2) or 0)
            return hours * 60 + minutes
        match = re.match(r'(\d+) min', duration_str)
        if match:
            return int(match.group(1))
        return None
    except (ValueError, AttributeError):
        return None

def process_data(data):
    # Convert JSON to DataFrame
    df = pd.DataFrame(data)
    
    # Example logic (adjust per real API)
    popular_routes = df.groupby(['origin', 'destination']).size().reset_index(name='count')
    top_routes = popular_routes.sort_values('count', ascending=False).head(5).to_dict(orient='records')

    return {
        "top_routes": top_routes,
        "total_flights": len(df),
        # Add price trends, peak days, etc.
    }

def process_flight_csv(csv_path):
    df = pd.read_csv(csv_path)
    
    # Clean and parse columns with error handling
    df['Price'] = df['Price'].apply(parse_price)
    df['CO2'] = df['co2 emissions'].apply(parse_co2)
    df['DurationMin'] = df['Flight Duration'].apply(parse_duration)
    
    # Filter out rows with invalid price data for calculations
    valid_price_df = df.dropna(subset=['Price'])
    valid_co2_df = df.dropna(subset=['CO2'])
    
    # Top airlines by avg price (only valid prices)
    if not valid_price_df.empty:
        top_airlines = valid_price_df.groupby('Airline Company')['Price'].mean().reset_index().sort_values('Price').to_dict(orient='records')
        price_hist = valid_price_df['Price'].tolist()
        top_cheapest = valid_price_df.sort_values('Price').head(5).to_dict(orient='records')
    else:
        top_airlines = []
        price_hist = []
        top_cheapest = []
    
    # Duration distribution
    duration_hist = df['DurationMin'].dropna().tolist()
    
    # CO2 by airline (only valid CO2 data)
    if not valid_co2_df.empty:
        co2_by_airline = valid_co2_df.groupby('Airline Company')['CO2'].mean().reset_index().to_dict(orient='records')
    else:
        co2_by_airline = []
    
    # Flights per airline
    flights_per_airline = df['Airline Company'].value_counts().reset_index().rename(columns={'index': 'Airline', 'Airline Company': 'Count'}).to_dict(orient='records')
    # Stops analysis
    stops_count = df['Stops'].value_counts().to_dict()
    # Price vs CO2 (only valid data)
    price_vs_co2 = df[['Price', 'CO2']].dropna().to_dict(orient='records')
    # Earliest/latest flights
    earliest = df.iloc[0].to_dict() if not df.empty else {}
    latest = df.iloc[-1].to_dict() if not df.empty else {}
    # All flights (for full table) - replace NaN with None for JSON compatibility
    all_flights = df.fillna('N/A').to_dict(orient='records')
    # Busiest day (date with most flights)
    busiest_day = None
    if 'Date' in df.columns:
        day_counts = df['Date'].value_counts()
        if not day_counts.empty:
            busiest_day = day_counts.idxmax()
    return {
        'top_airlines': top_airlines,
        'price_hist': price_hist,
        'duration_hist': duration_hist,
        'co2_by_airline': co2_by_airline,
        'flights_per_airline': flights_per_airline,
        'stops_count': stops_count,
        'price_vs_co2': price_vs_co2,
        'earliest_flight': earliest,
        'latest_flight': latest,
        'top_cheapest': top_cheapest,
        'total_flights': len(df),
        'sample_data': df.head(5).fillna('N/A').to_dict(orient='records'),
        'all_flights': all_flights,
        'busiest_day': busiest_day
    }
