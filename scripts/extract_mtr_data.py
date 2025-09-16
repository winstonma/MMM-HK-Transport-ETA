#!/usr/bin/env python3
import re
import json
import html
from pathlib import Path
import pdfplumber
import requests
from io import BytesIO
import sys
from urllib.parse import urljoin
from bs4 import BeautifulSoup

DATA_GOV_URL = "https://data.gov.hk/en-data/dataset/mtr-mtr_bus-mtr-bus-eta-data"
MTR_OPENDATA_BASE = "https://opendata.mtr.com.hk/"

# Regex patterns for parsing routes and stations from main body of document
route_header_pattern = re.compile(r"Route\s+([A-Z0-9]+)\s+\(([^)]+)\)", re.I)

def find_latest_pdf_url():
    """
    Finds the latest MTR Bus Data Dictionary PDF URL from the data.gov.hk portal.
    Returns the direct URL to the PDF file.
    """
    try:
        print("🔍 Finding latest MTR Bus Data Dictionary PDF...")
        print(f"🌐 Fetching dataset page: {DATA_GOV_URL}")
        
        # Fetch the data.gov.hk page
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(DATA_GOV_URL, headers=headers)
        response.raise_for_status()
        
        # Parse the HTML content
        soup = BeautifulSoup(response.content, 'html.parser')
        
        # Look for sections with "Data Dictionary" in the title
        # Find all resource sections that might contain data dictionaries
        resource_sections = soup.find_all(['div', 'section'], class_=['resource-item', 'resource', 'data-resource'])
        
        # Also look for headings with "Data Dictionary"
        headings = soup.find_all(['h2', 'h3', 'h4'], string=re.compile(r'Data\s+Dictionar(y|ies)', re.I))
        
        # Check both approaches
        pdf_urls = []
        
        # Method 1: Look in resource sections
        for section in resource_sections:
            links = section.find_all('a', href=re.compile(r'DataDictionary.*\.pdf', re.I))
            for link in links:
                href = link.get('href')
                if href:
                    if href.startswith('http'):
                        pdf_urls.append(href)
                    else:
                        pdf_urls.append(urljoin(DATA_GOV_URL, href))
        
        # Method 2: Look near headings with "Data Dictionary"
        for heading in headings:
            # Look for links in the same section or nearby elements
            parent = heading.parent
            links = parent.find_all('a', href=re.compile(r'\.pdf', re.I))
            for link in links:
                href = link.get('href')
                if href and 'DataDictionary' in href:
                    if href.startswith('http'):
                        pdf_urls.append(href)
                    else:
                        pdf_urls.append(urljoin(DATA_GOV_URL, href))
        
        # Method 3: Look for any PDF links with "DataDictionary" in the filename
        all_links = soup.find_all('a', href=re.compile(r'DataDictionary.*\.pdf', re.I))
        for link in all_links:
            href = link.get('href')
            if href:
                if href.startswith('http'):
                    pdf_urls.append(href)
                else:
                    pdf_urls.append(urljoin(DATA_GOV_URL, href))
        
        if pdf_urls:
            # Return the first match (should be the latest version)
            latest_pdf_url = pdf_urls[0]
            print(f"✅ Found PDF URL: {latest_pdf_url}")
            return latest_pdf_url
        else:
            raise Exception("Could not find MTR Bus Data Dictionary PDF URL on the page")
                
    except Exception as e:
        print(f"❌ Error finding PDF URL: {e}")
        raise

def open_pdf_source():
    """
    Downloads the PDF from the MTR Open Data portal.
    Returns a pdfplumber.PDF object.
    """
    try:
        pdf_url = find_latest_pdf_url()
        print(f"🌐 Downloading PDF from: {pdf_url}")
        response = requests.get(pdf_url)
        response.raise_for_status()
        print("✅ PDF downloaded successfully")
        return pdfplumber.open(BytesIO(response.content))
    except requests.RequestException as e:
        print(f"❌ Error downloading PDF: {e}")
        raise
    except Exception as e:
        print(f"❌ Error opening PDF: {e}")
        raise

def parse_route_descriptions_from_tables(pdf):
    """
    Extracts route descriptions from the 'Parameter 2' table using pdfplumber's
    table extraction, which is more reliable than text parsing for this structure.
    """
    descriptions = {}
    for page in pdf.pages:
        tables = page.extract_tables()
        for table in tables:
            if table and table[0] and table[0][0] and 'Parameter 2' in table[0][0]:
                last_route_number = None
                for row in table[1:]:
                    if len(row) < 3:
                        continue
                    
                    route_number_text = row[0]
                    description_text = row[2]

                    if route_number_text:
                        clean_route_number = html.unescape(route_number_text).replace('(routeName)', '').replace('\n', ' ').strip()
                        if clean_route_number:
                            last_route_number = clean_route_number
                    
                    if description_text and last_route_number:
                        clean_description_text = html.unescape(description_text).strip()
                        
                        if "Type\nString" in clean_description_text:
                            continue

                        parts = clean_description_text.split('\n')
                        desc_en, desc_zh = "", ""
                        if len(parts) >= 2:
                            desc_en, desc_zh = parts[0].strip(), parts[1].strip()
                        elif len(parts) == 1:
                            desc_en = desc_zh = parts[0].strip()
                        
                        if desc_en and desc_zh:
                            descriptions[last_route_number] = {
                                "description_en": desc_en,
                                "description_zh": desc_zh
                            }
    return descriptions

def parse_routes_and_stations(pdf, route_descriptions):
    """Extracts route station lists by processing page elements sequentially."""
    routes = {}
    for page in pdf.pages:
        # Get all headers and tables with their vertical positions
        headers = page.search(route_header_pattern.pattern, regex=True)
        tables = page.find_tables()

        # Create a single list of all relevant page objects
        page_objects = []
        for h in headers:
            page_objects.append({'type': 'header', 'top': h['top'], 'data': h})
        for t in tables:
            # Add only tables that have a header row
            if t.extract() and t.extract()[0]:
                 page_objects.append({'type': 'table', 'top': t.bbox[1], 'data': t})
        
        # Sort objects by their vertical position on the page
        page_objects.sort(key=lambda x: x['top'])
        
        current_header_info = None
        for obj in page_objects:
            if obj['type'] == 'header':
                match = route_header_pattern.search(obj['data']['text'])
                if match:
                    current_header_info = match.groups()
            elif obj['type'] == 'table' and current_header_info:
                route_no, direction = current_header_info
                table_obj = obj['data']
                
                table_data = table_obj.extract()
                if not table_data or not table_data[0]:
                    continue

                table_header = [str(h or '').replace('\n', ' ') for h in table_data[0]]
                
                # Check if this is a proper table with headers or a table that starts with data
                has_proper_header = "STATION ID" in " ".join(table_header)
                
                # Special case for Route 506 Inbound - it doesn't have a proper header row
                is_route_506_inbound = (route_no == "506" and "Inbound" in direction)
                
                if not has_proper_header and not is_route_506_inbound:
                    continue
                
                # Determine column positions
                header_map = {'id': -1, 'ch': -1, 'en': -1, 'lat': -1, 'long': -1}
                
                if has_proper_header:
                    # Normal case with header row
                    for idx, h_text in enumerate(table_header):
                        h_text = h_text.upper()
                        if "STATION ID" in h_text: header_map['id'] = idx
                        elif "NAME (CHI)" in h_text: header_map['ch'] = idx
                        elif "NAME (ENG)" in h_text: header_map['en'] = idx
                        elif "LAT" in h_text: header_map['lat'] = idx
                        elif "LONG" in h_text: header_map['long'] = idx
                    
                    if header_map['id'] == -1 or header_map['ch'] == -1 or header_map['en'] == -1:
                        continue
                    
                    # Data starts from row 1 (skip header)
                    data_rows = table_data[1:]
                else:
                    # Special case for Route 506 Inbound - no header row, data starts from row 0
                    # Assume standard column order: ID, LAT, LONG, CHI, ENG
                    header_map = {'id': 0, 'lat': 1, 'long': 2, 'ch': 3, 'en': 4}
                    # Data starts from row 0
                    data_rows = table_data
                
                current_line_stops = []
                for row in data_rows:
                    try:
                        ref_id = row[header_map['id']].strip() if row[header_map['id']] else ""
                        name_ch = row[header_map['ch']] if row[header_map['ch']] else ""
                        name_en = row[header_map['en']] if row[header_map['en']] else ""
                        
                        # Extract latitude and longitude if available
                        lat = None
                        long = None
                        if header_map['lat'] != -1 and row[header_map['lat']]:
                            try:
                                lat = float(row[header_map['lat']])
                            except (ValueError, TypeError):
                                pass
                        if header_map['long'] != -1 and row[header_map['long']]:
                            try:
                                long = float(row[header_map['long']])
                            except (ValueError, TypeError):
                                pass
                        
                        if not all([ref_id, name_ch, name_en]):
                            continue
                        
                        name_ch = html.unescape(str(name_ch)).replace('\n', ' ').strip()
                        name_en = html.unescape(str(name_en)).replace('\n', ' ').strip()
                        
                        stop_data = {
                            "name_en": re.sub(r'\s+', ' ', name_en).replace(' (', '('),
                            "name_ch": re.sub(r'\s+', ' ', name_ch).replace(' (', '('),
                            "ref_ID": ref_id.strip()
                        }
                        
                        # Add latitude and longitude if available
                        if lat is not None:
                            stop_data["latitude"] = lat
                        if long is not None:
                            stop_data["longitude"] = long
                        
                        current_line_stops.append(stop_data)
                    except (IndexError, TypeError):
                        continue
                
                if current_line_stops:
                    routes.setdefault(route_no, {"lines": []})
                    desc_info = route_descriptions.get(route_no, {})
                    base_desc_en = desc_info.get('description_en', f"{route_no} {direction}")
                    base_desc_zh = desc_info.get('description_zh', f"{route_no} {direction}")
                    
                    # Create more accurate direction descriptions based on actual first and last stops
                    first_stop_en = current_line_stops[0]["name_en"] if current_line_stops else ""
                    last_stop_en = current_line_stops[-1]["name_en"] if current_line_stops else ""
                    first_stop_zh = current_line_stops[0]["name_ch"] if current_line_stops else ""
                    last_stop_zh = current_line_stops[-1]["name_ch"] if current_line_stops else ""
                    
                    # Use the base description if first/last stops are not available or are the same
                    if first_stop_en and last_stop_en and first_stop_en != last_stop_en:
                        desc_en = f"{first_stop_en} to {last_stop_en}"
                    else:
                        desc_en = base_desc_en
                    
                    if first_stop_zh and last_stop_zh and first_stop_zh != last_stop_zh:
                        desc_zh = f"{first_stop_zh}至{last_stop_zh}"
                    else:
                        desc_zh = base_desc_zh
                    
                    routes[route_no]["lines"].append({
                        "description_en": desc_en,
                        "description_zh": desc_zh,
                        "stops": current_line_stops
                    })
    return routes

def build_json(routes):
    return [
        {"route_number": route_no, "lines": data["lines"]}
        for route_no, data in sorted(routes.items())
    ]

def print_summary(json_data):
    """Prints a summary of the extracted route data."""
    print("\n--- 📊 Extraction Summary ---")
    print(f"Total routes found: {len(json_data)}")
    for route in json_data:
        route_num = route['route_number']
        num_lines = len(route['lines'])
        print(f"\n## Route: {route_num}")
        print(f"  - Lines (directions): {num_lines}")
        for i, line in enumerate(route['lines']):
            num_stops = len(line['stops'])
            desc = line['description_en']
            print(f"    - Line {i+1} ('{desc}'): {num_stops} stops")
    print("--------------------------\n")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python test.py <output_json_file>")
        sys.exit(1)
    
    output_json = sys.argv[1]
    
    print("🔍 Starting PDF extraction...")
    try:
        with open_pdf_source() as pdf:
            route_descriptions = parse_route_descriptions_from_tables(pdf)
            routes = parse_routes_and_stations(pdf, route_descriptions)

        json_data = build_json(routes)

        with open(output_json, "w", encoding="utf-8") as f:
            json.dump(json_data, f, ensure_ascii=False, indent="\t")

        print(f"✅ Extracted {len(json_data)} routes to {output_json}")
        
        # Print the summary of the extracted data
        print_summary(json_data)
    except Exception as e:
        print(f"❌ Error during PDF extraction: {e}")
        sys.exit(1)