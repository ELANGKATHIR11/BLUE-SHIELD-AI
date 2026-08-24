"""
============================================================================
PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.

OWNER & INVENTOR: Elangkathir (GitHub: https://github.com/ELANGKATHIR11)

NOTICE & RESTRICTIONS:
1. COMMERCIAL USE, DUPLICATION, OR RE-DISTRIBUTION IS STRICTLY PROHIBITED.
2. ONLY THE AUTHORIZED OWNER HOLDS ALL INTELLECTUAL PROPERTY & USAGE RIGHTS.
3. NO AI CODING ASSISTANT, AUTOMATED AGENT, OR THIRD-PARTY MODEL IS PERMITTED
   TO COPY, MODIFY, SCRAPE, OR ALTER THIS CODEBASE WITHOUT EXPLICIT PERMISSION.
============================================================================
"""
# ============================================================================
# PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
# COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
#
# OWNER & INVENTOR: Elangkathir (GitHub: https://github.com/ELANGKATHIR11)
# 
# NOTICE & RESTRICTIONS:
# 1. COMMERCIAL USE, DUPLICATION, OR RE-DISTRIBUTION IS STRICTLY PROHIBITED.
# 2. ONLY THE AUTHORIZED OWNER HOLDS ALL INTELLECTUAL PROPERTY & USAGE RIGHTS.
# 3. NO AI CODING ASSISTANT, AUTOMATED AGENT, OR THIRD-PARTY MODEL IS PERMITTED
#    TO COPY, MODIFY, SCRAPE, OR ALTER THIS CODEBASE WITHOUT EXPLICIT PERMISSION.
# ============================================================================
"""
BLUE SHIELD AI — Synthetic AIS / fishing-vessel trajectory generator

Why synthetic: no bulk, freely-downloadable India-specific fishing-vessel AIS
dataset exists (Global Fishing Watch has real coverage of the Indian Ocean but
requires a free API key + per-account rate limits — see ml_data/README.md).
This generator produces physically-plausible, labelled tracks seeded on the
REAL ports, coastline and IMBL geometry built by build_datasets.py, so the
geometry your models learn against matches the geometry your GIS layers use.

Output columns: mmsi, timestamp, lat, lon, sog_knots, cog_deg, trip_id,
event_label (normal_fishing | transit | imbl_approach | imbl_crossing |
distress_drift), distance_to_imbl_km
"""
import numpy as np
import pandas as pd
import geopandas as gpd
from shapely.geometry import Point
from pyproj import Geod
from datetime import datetime, timedelta

GEOD = Geod(ellps="WGS84")
RNG = np.random.default_rng(42)

VEC = "/home/claude/blueshield_gis/outputs/vector"
OUT = "/home/claude/blueshield_gis/outputs/ml_data"
import os
os.makedirs(OUT, exist_ok=True)

ports = gpd.read_file(f"{VEC}/india_ports.geojson")
# Focus on Tamil Nadu / Palk Bay fishing harbours for this sample batch —
# fall back to bbox filter if the 'name' field isn't populated in this layer.
tn_ports = ports.cx[78:81, 8:11]
if tn_ports.empty:
    tn_ports = ports  # fallback

imbl = gpd.read_file(f"{VEC}/imbl_india_srilanka.geojson")
palk_line = imbl[imbl["segment"].str.contains("Palk|Mannar", case=False, na=False)].unary_union

def sample_start_port():
    row = tn_ports.sample(1, random_state=RNG.integers(0, 1_000_000)).iloc[0]
    geom = row.geometry
    return geom.x, geom.y

def move(lon, lat, bearing_deg, dist_km):
    lon2, lat2, _ = GEOD.fwd(lon, lat, bearing_deg, dist_km * 1000)
    return lon2, lat2

def dist_to_line_km(lon, lat, line):
    nearest = line.interpolate(line.project(Point(lon, lat)))
    _, _, d = GEOD.inv(lon, lat, nearest.x, nearest.y)
    return d / 1000.0

def generate_trip(mmsi, trip_id, start_time, behaviour):
    lon, lat = sample_start_port()
    t = start_time
    rows = []
    heading = RNG.uniform(60, 160)  # roughly seaward out of Palk Bay ports
    speed = RNG.uniform(6, 9)

    n_steps = RNG.integers(60, 180)
    crossed = False
    for i in range(n_steps):
        d_imbl = dist_to_line_km(lon, lat, palk_line)

        if behaviour == "normal_fishing":
            label = "transit" if i < 10 else "normal_fishing"
            heading += RNG.uniform(-25, 25)
            speed = np.clip(speed + RNG.uniform(-1, 1), 1.5, 8)
            # normal fishing keeps a respectful margin from the IMBL
            if d_imbl < 3:
                heading += 180
        elif behaviour == "imbl_approach":
            label = "transit" if d_imbl > 5 else "imbl_approach"
            heading += RNG.uniform(-8, 8)
            speed = np.clip(speed + RNG.uniform(-0.5, 0.5), 4, 9)
        elif behaviour == "imbl_crossing":
            if d_imbl > 4:
                label = "transit"
            elif not crossed:
                label = "imbl_crossing"
                if d_imbl < 0.5:
                    crossed = True
            else:
                label = "imbl_crossing"
            heading += RNG.uniform(-5, 5)
            speed = np.clip(speed + RNG.uniform(-0.5, 0.5), 4, 9)
        elif behaviour == "distress_drift":
            label = "normal_fishing" if i < n_steps * 0.6 else "distress_drift"
            if i >= n_steps * 0.6:
                # engine failure -> drifting with wind/current, erratic heading, falling speed
                heading += RNG.uniform(-40, 40)
                speed = max(speed - RNG.uniform(0.1, 0.4), 0)
            else:
                heading += RNG.uniform(-20, 20)
                speed = np.clip(speed + RNG.uniform(-1, 1), 1.5, 8)

        step_km = speed * 1.852 * (10 / 60)  # 10-minute reporting interval, knots -> km
        lon, lat = move(lon, lat, heading, step_km)
        t = t + timedelta(minutes=10)

        rows.append({
            "mmsi": mmsi, "timestamp": t.isoformat(), "lat": round(lat, 5),
            "lon": round(lon, 5), "sog_knots": round(speed, 2),
            "cog_deg": round(heading % 360, 1), "trip_id": trip_id,
            "event_label": label, "distance_to_imbl_km": round(d_imbl, 3),
        })
    return rows

behaviours = ["normal_fishing"] * 6 + ["imbl_approach"] * 2 + ["imbl_crossing"] * 1 + ["distress_drift"] * 1
all_rows = []
start = datetime(2026, 1, 1, 5, 0, 0)
for i, beh in enumerate(behaviours):
    mmsi = 419000000 + i
    all_rows.extend(generate_trip(mmsi, trip_id=f"trip_{i:03d}", start_time=start + timedelta(hours=i), behaviour=beh))

df = pd.DataFrame(all_rows)
df.to_csv(f"{OUT}/sample_synthetic_ais_tracks.csv", index=False)
print(f"Wrote {len(df)} rows across {df['trip_id'].nunique()} trips -> {OUT}/sample_synthetic_ais_tracks.csv")
print(df["event_label"].value_counts())
