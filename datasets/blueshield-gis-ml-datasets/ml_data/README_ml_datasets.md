# ML Training Data — Real Sources + Synthetic Fallback

## Why synthetic data is part of this pack
There is no bulk, freely-downloadable, India/Palk-Bay-specific fishing-vessel
AIS dataset. The one organization with real Indian Ocean AIS coverage
(Global Fishing Watch) gates it behind a free API key with rate limits, not a
bulk download. That's why `generate_synthetic_ais.py` exists — it's seeded on
the *real* coastline, port, and IMBL geometry in `../vector/`, so tracks are
geometrically consistent with your actual GIS layers, and it labels events
(`normal_fishing`, `imbl_approach`, `imbl_crossing`, `distress_drift`) so it's
directly usable for the anomaly-detection / border-prediction / risk-scoring
models the project scope calls for.

Scale it up by running:
```bash
python3 generate_synthetic_ais.py   # edit `behaviours` list / n_steps for volume
```

## Real data sources worth wiring in

### 1. Global Fishing Watch (best real option — Indian Ocean coverage)
- Free API key: https://globalfishingwatch.org/our-apis/
- **Events API** — fishing events, encounters, loitering, port visits, AIS-disabling events
- **Vessels API** — vessel identity/registry cross-referenced against AIS
- **4Wings API** — gridded AIS vessel-presence / fishing-effort rasters
- Also downloadable as CSV batches (2012–present) via the data-download portal for a bounding box you define — draw a box over the Arabian Sea / Bay of Bengal / Palk Bay and export.
- Python package: `gfwr` (R) or direct REST calls with `requests` once you have a token — I can write the fetch script once you've generated a key (I can't call their domain directly from this sandbox — it's not on the outbound network allowlist here).

### 2. Generic AIS datasets (for pretraining a vessel-behaviour classifier, not India-specific)
- Kaggle: several public AIS trip datasets (Strait of Juan de Fuca, Kattegat Strait, general vessel-tracking dumps) — good for pretraining a base LSTM/trajectory model before fine-tuning on your synthetic or GFW-sourced India data.
- NOAA Marine Cadastre AIS data — US-coverage only, but very clean and high-volume; useful for the same pretraining purpose.

### 3. Weather / ocean-state (for the Weather Risk / Fuel Optimization features)
- INCOIS (Indian National Centre for Ocean Information Services) — Ocean State Forecast, cyclone warnings: https://incois.gov.in
- IMD (India Meteorological Department) — cyclone best-track data, monsoon forecasts: https://mausam.imd.gov.in
- Open-Meteo / NOAA GFS — global weather API, free, no key required, good fallback for real-time weather layers.

### 4. Fish-detection imagery (if the project ever needs onboard camera CV, not just AIS)
- Fishnet Open Images Database — 86k labelled EM-camera images, 34 species/object classes: https://www.fishnet.ai/

## Sample output columns (`sample_synthetic_ais_tracks.csv`)
`mmsi, timestamp, lat, lon, sog_knots, cog_deg, trip_id, event_label, distance_to_imbl_km`
