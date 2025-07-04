# Standalone flight scraper for date ranges.
# Usage: python flight_scraper.py SFO LAX 2024-12-25 2024-12-31 --filename csv_output/flight_data.csv

import asyncio
import csv
import base64
from playwright.async_api import async_playwright
from typing import List, Dict, Optional
import pandas as pd
from datetime import datetime, timedelta
import os
import argparse

import asyncio
import csv
import base64
from playwright.async_api import async_playwright
from typing import List, Dict, Optional
import pandas as pd


class FlightURLBuilder:
    """Class to handle flight URL creation with base64 encoding."""
    
    @staticmethod
    def _create_one_way_bytes(departure: str, destination: str, date: str) -> bytes:
        """Create bytes for one-way flight."""
        return (
            b'\x08\x1c\x10\x02\x1a\x1e\x12\n' + date.encode() +
            b'j\x07\x08\x01\x12\x03' + departure.encode() +
            b'r\x07\x08\x01\x12\x03' + destination.encode() +
            b'@\x01H\x01p\x01\x82\x01\x0b\x08\xfc\x06`\x04\x08'
        )
    
    @staticmethod
    def _modify_base64(encoded_str: str) -> str:
        """Add underscores at the specific position in base64 string."""
        insert_index = len(encoded_str) - 6
        return encoded_str[:insert_index] + '_' * 7 + encoded_str[insert_index:]

    @classmethod
    def build_url(
        cls,
        departure: str,
        destination: str,
        departure_date: str
    ) -> str:
        
        flight_bytes = cls._create_one_way_bytes(departure, destination, departure_date)
        base64_str = base64.b64encode(flight_bytes).decode('utf-8')
        modified_str = cls._modify_base64(base64_str)
        return f'https://www.google.com/travel/flights/search?tfs={modified_str}'


async def setup_browser():
    p = await async_playwright().start()
    browser = await p.chromium.launch(headless=True)  # Always headless
    page = await browser.new_page()
    return p, browser, page


async def extract_flight_element_text(flight, selector: str, aria_label: Optional[str] = None) -> str:
    """Extract text from a flight element using selector and optional aria-label."""
    if aria_label:
        element = await flight.query_selector(f'{selector}[aria-label*="{aria_label}"]')
    else:
        element = await flight.query_selector(selector)
    return await element.inner_text() if element else "N/A"


async def scrape_flight_info(flight) -> Dict[str, str]:
    """Extract all relevant information from a single flight element."""
    departure_time = await extract_flight_element_text(flight, 'span', "Departure time")
    arrival_time =  await extract_flight_element_text(flight, 'span', "Arrival time")
    airline = await extract_flight_element_text(flight, ".sSHqwe")
    duration = await extract_flight_element_text(flight, "div.gvkrdb")
    stops =  await extract_flight_element_text(flight, "div.EfT7Ae span.ogfYpf")
    price =  await extract_flight_element_text(flight, "div.FpEdX span")
    co2_emissions =  await extract_flight_element_text(flight, "div.O7CXue")
    emissions_variation =  await extract_flight_element_text(flight, "div.N6PNV")
    return {
        "Departure Time": departure_time,
        "Arrival Time": arrival_time,
        "Airline Company": airline,
        "Flight Duration": duration,
        "Stops": stops,
        "Price": price,
        "co2 emissions": co2_emissions,
        "emissions variation": emissions_variation
    }

def clean_csv(filename: str):
    """Clean unwanted characters from the saved CSV file."""
    data = pd.read_csv(filename, encoding="utf-8")
    
    def clean_text(value):
        if isinstance(value, str):
            return value.replace('Â', '').replace(' ', ' ').replace('Ã', '').replace('¶', '').strip()
        return value

    # Use DataFrame.map for each column instead of applymap
    cleaned_data = data.apply(lambda col: col.map(clean_text))
    cleaned_file_path = f"{filename}"
    cleaned_data.to_csv(cleaned_file_path, index=False)
    print(f"Cleaned CSV saved to: {cleaned_file_path}")

def save_to_csv(data: List[Dict[str, str]], filename: str = "flight_data.csv") -> None:
    """Save flight data to a CSV file in the csv_output folder."""
    if not data:
        return
    # Ensure output is always in csv_output folder
    output_dir = os.path.join(os.path.dirname(__file__), 'csv_output')
    os.makedirs(output_dir, exist_ok=True)
    # If filename is not an absolute path, join with csv_output
    if not os.path.isabs(filename):
        filename = os.path.join(output_dir, os.path.basename(filename))
    headers = list(data[0].keys())
    with open(filename, 'w', newline='', encoding='utf-8') as csvfile:
        writer = csv.DictWriter(csvfile, fieldnames=headers)
        writer.writeheader()
        writer.writerows(data)
    # Clean the saved CSV
    clean_csv(filename)

async def scrape_flight_data(one_way_url):
    flight_data = []

    playwright, browser, page = await setup_browser()
    
    try:
        await page.goto(one_way_url)
        
        # Wait for flight data to load
        await page.wait_for_selector(".pIav2d")
        
        # Get all flights and extract their information
        flights = await page.query_selector_all(".pIav2d")
        for flight in flights:
            flight_info = await scrape_flight_info(flight)
            flight_data.append(flight_info)
        
        # Save the extracted data in CSV format
        save_to_csv(flight_data)
            
    finally:
        await browser.close()
        await playwright.stop()

# Add missing scrape_flights_date_range
async def scrape_flights_date_range(origin, destination, start_date, end_date, filename):
    """Scrape flights for each date in the range and append to CSV."""
    start = datetime.strptime(start_date, "%Y-%m-%d")
    end = datetime.strptime(end_date, "%Y-%m-%d")
    all_data = []
    for n in range((end - start).days + 1):
        date_str = (start + timedelta(days=n)).strftime("%Y-%m-%d")
        url = FlightURLBuilder.build_url(origin, destination, date_str)
        print(f"Scraping {origin} to {destination} for {date_str}...")
        data = await scrape_flight_data_collect(url)
        for row in data:
            row['Date'] = date_str
        all_data.extend(data)
    save_to_csv(all_data, filename)

# Helper to collect data for a single day (returns list, doesn't save)
async def scrape_flight_data_collect(one_way_url):
    flight_data = []
    p, browser, page = await setup_browser()
    try:
        await page.goto(one_way_url)
        await page.wait_for_selector(".pIav2d")
        flights = await page.query_selector_all(".pIav2d")
        for flight in flights:
            flight_info = await scrape_flight_info(flight)
            flight_data.append(flight_info)
        return flight_data
    finally:
        await browser.close()
        await p.stop()

if __name__ == "__main__":
    one_way_url = FlightURLBuilder.build_url(
        departure="SFO",
        destination="LAX",
        departure_date="2025-07-25"
    )
    print("One-way URL:", one_way_url)

    # Run the scraper
    asyncio.run(scrape_flight_data(one_way_url))

# Example CLI entrypoint:
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scrape flights for a date range.")
    parser.add_argument("origin", type=str, help="Origin airport code")
    parser.add_argument("destination", type=str, help="Destination airport code")
    parser.add_argument("start_date", type=str, help="Start date (YYYY-MM-DD)")
    parser.add_argument("end_date", type=str, help="End date (YYYY-MM-DD)")
    parser.add_argument("--filename", type=str, default="csv_output/flight_data.csv", help="CSV output filename")
    args = parser.parse_args()
    asyncio.run(scrape_flights_date_range(args.origin, args.destination, args.start_date, args.end_date, args.filename))