import pandas as pd
import geopandas as gpd
import json
import os
from shapely.geometry import shape

# Load Excel
df = pd.read_excel('./Data/master final complete.xlsx')

# === Step 1: Clean column names ===
df.columns = (
    df.columns.str.strip()
               .str.replace('\n', ' ')
               .str.replace(' +', ' ', regex=True)
)

# === Step 2: Rename important columns ===
df = df.rename(columns={
    'Grid_Id': 'Grid_Id',
    'Ward_Name': 'Ward_Name',
    'Pop Density (#/km2)': 'pop_density',
    '% Built Up Area': 'built_up',
    'Retail Potential Score': 'retail_potential',
    'Gap': 'Gap',  # preserve capitalized
    'Cigg_Outlet_Count': 'cigg_outlet_count',
    'Pcp_Outlet_Count': 'pcp_outlet_count',
    'Food_Outlet_Count': 'food_outlet_count'
})

# === Step 3: Convert Geo JSON string to actual geometry ===
df['geometry'] = df['geo'].apply(lambda x: shape(json.loads(x)))
df = df.drop(columns=['geo'])

# === Step 4: Convert to GeoDataFrame ===
gdf = gpd.GeoDataFrame(df, geometry='geometry', crs='EPSG:4326')

# === Step 5: Export to GeoJSON ===
output_path = './js/outlet_layers/grid_data.geojson'
os.makedirs(os.path.dirname(output_path), exist_ok=True)
gdf.to_file(output_path, driver='GeoJSON')

print("✅ GeoJSON successfully saved with outlet counts and cleaned headers.")




