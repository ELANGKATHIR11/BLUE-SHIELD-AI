# BLUE SHIELD AI — Maritime GIS & ML Dataset Pack

Built from verifiable public sources — no fabricated coordinates for anything
legally or geopolitically sensitive. Where a genuine public dataset doesn't
exist (most restricted-zone data, bulk India-specific AIS), that's stated
explicitly below rather than invented.

## What's authoritative vs. derived vs. approximate

| Layer | Status | Source |
|---|---|---|
| `vector/imbl_india_srilanka.*` | **Authoritative — exact treaty text** | UN DOALOS, India–Sri Lanka maritime boundary agreements: [1974 Palk Strait/historic waters](https://www.un.org/Depts/los/LEGISLATIONANDTREATIES/PDFFILES/TREATIES/LKA-IND1974BW.PDF), [1976 Gulf of Mannar & Bay of Bengal](https://www.un.org/Depts/los/LEGISLATIONANDTREATIES/PDFFILES/TREATIES/LKA-IND1976MB.PDF). Coordinates transcribed directly from the treaty articles. |
| `vector/india_eez.*`, `neighbouring_eez.*` | **Authoritative — official maritime-boundary database** | Flanders Marine Institute (VLIZ) / Marine Regions, *World EEZ v4* (2024), via the [lsdch/countries-boundaries](https://github.com/lsdch/countries-boundaries) GeoJSON conversion. Original: [marineregions.org](https://www.marineregions.org/downloads.php) (CC-BY 4.0). **Note:** `POL_TYPE = "Union EEZ and country"` — the polygon and `AREA_KM2` field include India's land area *plus* EEZ combined (~4.8M km²), not the marine EEZ alone (~2.3M km² per UNCLOS). If you need the marine-only polygon, download the plain "World EEZ v12" product directly from marineregions.org (200 NM zone only, no land union). |
| `vector/india_coastline.*`, `india_ports.*` | **Authoritative — standard reference dataset** | Natural Earth 10m Cultural/Physical vectors, via [martynafford/natural-earth-geojson](https://github.com/martynafford/natural-earth-geojson) (public domain). |
| `raster/bathymetry_depth_bands_m.tif` | **Coarse reference only** | Rasterized from Natural Earth 10m depth-contour bands (global 1:10M scale). Fine for prototype visualization; **not** survey-grade. For real navigation/ML-grade bathymetry get [GEBCO](https://www.gebco.net/data-and-products/gridded-bathymetry-data/) (15 arc-second global grid, free, no login) or INCOIS coastal bathymetry. |
| `raster/distance_to_coastline_km.tif`, `distance_to_imbl_km.tif` | **Derived** | Computed in this pipeline (geodesic nearest-distance) from the authoritative vector layers above. Useful directly as ML features (e.g. `distance_to_imbl_km` for border/risk-prediction models). |
| `vector/geofence_imbl_buffer_*nm.*` | **Operational convention, not a legal boundary** | 1/3/5 NM buffers around the treaty IMBL line — a common early-warning geofence pattern (flag a vessel *approaching* the border before it crosses). Legally the IMBL itself (0 NM) is the actual boundary. |
| `vector/geofence_territorial_sea_12nm_approx.*` | **Approximate** | Simple 12 NM buffer from the Natural Earth coastline. India's actual territorial-sea baseline is defined by specific basepoints published by the Ministry of External Affairs / National Hydrographic Office — this is a geometric approximation good enough for prototype geofencing, not for legal/operational use. |
| India–Pakistan boundary (Sir Creek) | **Not included — genuinely undelimited** | This maritime boundary remains disputed/unresolved between the two governments. No authoritative line exists to encode; treat any shapefile online claiming otherwise with caution. |
| India–Bangladesh boundary | **Not included as a precision line** | Settled by the 2014 Permanent Court of Arbitration award, but the full coordinate table sits inside a 100+ page award document I didn't transcribe in this pass. The `india_eez.shp` polygon reflects the current (post-award) EEZ from Marine Regions. If you need the precise treaty line, the award is here: [PCA award, 7 Jul 2014](https://pca-cpa.org/en/news/bay-of-bengal-maritime-boundary-arbitration-between-bangladesh-and-india-bangladesh-v-india/) — I can transcribe it in a follow-up if useful. |
| "Prohibited fishing zones" (CMFRI/state Fisheries Dept notifications) | **Not available as public GIS** | These are published as text notifications (e.g. distance-from-shore trawling bans, seasonal closures), not as a unified downloadable shapefile. Building a real layer needs either a data request to the state Fisheries Department / CMFRI, or manual digitization from the notifications. Flagging this honestly rather than fabricating zone polygons. |
| Coastal Regulation Zone (CRZ I–IV) | **Not included** | MoEFCC publishes CRZ maps via the Sagar Vaani / CRZ notification system on a state-by-state basis, not as one bulk national download. Worth a targeted follow-up if this matters for your compliance features. |

## Files

```
vector/
  india_eez.shp / .geojson                    India EEZ + territory polygon
  neighbouring_eez.shp / .geojson              PAK, LKA, MDV, BGD, MMR, THA, IDN EEZs
  india_coastline.shp / .geojson               Coastline, clipped to Indian coast bbox
  india_ports.shp / .geojson                   Ports/harbours in bbox
  imbl_india_srilanka.shp / .geojson           3 treaty segments (Palk Strait, Gulf of Mannar, Bay of Bengal)
  geofence_imbl_buffer_1nm/3nm/5nm.shp/.geojson  Operational approach buffers around IMBL
  geofence_territorial_sea_12nm_approx.shp/.geojson  Approximate 12NM buffer

raster/
  bathymetry_depth_bands_m.tif                 Coarse depth bands, EPSG:4326, ~2.2km cells
  distance_to_coastline_km.tif                 Full Indian-coast bbox, ~2.2km cells
  distance_to_imbl_km.tif                      Palk Bay/Gulf of Mannar bbox, ~550m cells

ml_data/
  sample_synthetic_ais_tracks.csv              10 labelled synthetic trips (see below)
  generate_synthetic_ais.py                    Generator script (re-run for more data)
  README_ml_datasets.md                        Real-data sources + how to plug them in
```

## ML training data — what's real vs. what you'll need to generate

No bulk, freely-downloadable, India-specific fishing-vessel AIS dataset
exists. See `ml_data/README_ml_datasets.md` for the actual options (Global
Fishing Watch API, generic Kaggle AIS sets for pretraining, INCOIS/IMD
weather feeds) and a synthetic generator that's seeded on the real
coastline/port/IMBL geometry above so your synthetic tracks are
geometrically consistent with your GIS layers.

## CRS note

All vector layers are EPSG:4326 (WGS84 lat/lon). Rasters are EPSG:4326 too —
reproject to a local UTM/AEQD CRS before doing area or precise-distance
calculations in a GIS tool that assumes a projected CRS.
