# MTR Bus Data Extraction Script

This script extracts MTR Bus route and station information from the official MTR Bus Data Dictionary PDF and converts it to JSON format.

## Usage

To run the script, execute from the module root directory:

```bash
python3 scripts/extract_mtr_data.py <output_json_file>
```

For example:
```bash
python3 scripts/extract_mtr_data.py data/mtr_bus_routes.json
```

This will:
1. Download the latest MTR Bus Data Dictionary PDF from the DATA.GOV.HK portal
2. Extract route and station information
3. Save the data as JSON to the specified output file

## Requirements

The script requires the following Python packages:
- pdfplumber
- requests
- beautifulsoup4

Install them with:
```bash
pip install pdfplumber requests beautifulsoup4
```