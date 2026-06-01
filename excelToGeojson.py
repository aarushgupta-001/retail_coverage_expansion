import pandas as pd
import geopandas as gpd
from shapely.geometry import Point
import re
import os

# === Clean outlet name ===
def clean_outlet_name(name):
    if not isinstance(name, str):
        return name
    name = re.sub(r'[^a-zA-Z\s]', ' ', name)  # Replace special characters/numbers with space
    name = re.sub(r'\s+', ' ', name).strip()  # Collapse multiple spaces
    return name.upper()                      # Convert to uppercase

# === Clean Excel and Export GeoJSON ===
def clean_and_export(file_path, cleaned_excel_path, geojson_path):
    # Step 1: Load Excel
    df = pd.read_excel(file_path)

    # Step 2: Normalize column names
    df.columns = df.columns.str.strip().str.replace(' ', '_').str.lower()

    # Step 3: Clean outlet_name
    if 'outlet_name' in df.columns:
        df['outlet_name'] = df['outlet_name'].apply(clean_outlet_name)

    # Step 4: Save cleaned Excel
    df.to_excel(cleaned_excel_path, index=False)
    print(f"✅ Cleaned Excel saved: {cleaned_excel_path}")

    # Step 5: Reload cleaned data
    df = pd.read_excel(cleaned_excel_path)
    df.columns = df.columns.str.strip().str.replace(' ', '_').str.lower()


    # Step 6: Create GeoDataFrame
    df = df.dropna(subset=['latitude', 'longitude'])
    df = df[(df['latitude'] != 0) & (df['longitude'] != 0)].copy()
    df['geometry'] = df.apply(lambda row: Point(row['longitude'], row['latitude']), axis=1)

    gdf = gpd.GeoDataFrame(df, geometry='geometry', crs="EPSG:4326")
    gdf.to_file(geojson_path, driver='GeoJSON')
    print(f"✅ GeoJSON exported: {geojson_path}")

# === File mappings: Excel → Cleaned Excel → GeoJSON ===
file_mappings = {
    'Filtered_Retail_Outlets_Final.xlsx': ('Filtered_Retail_Outlets_Final_CLEANED.xlsx', 'independent_outlets.geojson'),
    'retail_Cigg.xlsx':                   ('retail_Cigg_CLEANED.xlsx',                   'cigarette_outlets.geojson'),
    'retail_Food.xlsx':                   ('retail_Food_CLEANED.xlsx',                   'food_outlets.geojson'),
    'retail_PCP.xlsx':                    ('retail_PCP_CLEANED.xlsx',                    'pcp_outlets.geojson')
}

# === Run all ===
data_folder = './Data'
output_folder = './js'

for excel_file, (cleaned_excel_name, geojson_name) in file_mappings.items():
    file_path = os.path.join(data_folder, excel_file)
    cleaned_excel_path = os.path.join(data_folder, cleaned_excel_name)
    geojson_path = os.path.join(output_folder, geojson_name)
    clean_and_export(file_path, cleaned_excel_path, geojson_path)
