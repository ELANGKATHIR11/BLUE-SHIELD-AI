# BLUE SHIELD AI — Verified ML Training Datasets

Every source below was checked this session. Access method, license, and size are stated. Where I could retrieve data directly, it's in `gfw_labels/`.

---

## ✅ Retrieved for you — GFW expert fishing labels

**`gfw_labels/ALL_labeled_fishing_intervals.csv`** — 141,513 expert-labeled intervals, 452 vessels, 2011–2016.

| Field | Meaning |
|---|---|
| `mmsi` | Anonymized vessel ID |
| `start_time` / `end_time` | ISO8601 interval |
| `is_fishing` | 1.0 = fishing, 0.0 = not fishing |
| `source` | Which labeling campaign |

Class balance: **72,857 fishing / 68,656 non-fishing** — near-perfectly balanced, which is rare and valuable. Labeled by fisheries experts, not heuristics.

**`gfw_labels/mmsis.csv`** — 23,142 vessels with gear-type labels: 17,799 fishing / 5,291 non-fishing. Gear breakdown: Trawlers 4,513 · Cargo/Tanker 3,095 · Fixed gear 1,070 · Purse seines 589 · Drifting longlines 294 · Squid 164 · Pole and line 114.

**License:** CC-BY 4.0 (free commercial + academic use, attribution required).
**Source:** https://github.com/GlobalFishingWatch/training-data

### The missing half — how to get the tracks
These labels are *time intervals*; the matching AIS position tracks are stored via **git-LFS** (~770MB) and the LFS media host is outside my sandbox's network allowlist, so I could not pull them. You can, in one command:

```bash
git lfs install
git clone https://github.com/GlobalFishingWatch/training-data.git
cd training-data && ./prepare.sh    # joins tracks to labels
```

A plain ZIP download will **not** work — you'll get pointer stubs, which is what I hit. The repo README says this explicitly.

What you get: `data/tracks/` (1,258 per-vessel `.npz` track files) and `data/labeled/` (21 pre-joined feature+label `.npz` files, 181MB largest). Join key is `mmsi` + timestamp within interval.

**This is your Model C dataset.** Windowed kinematic features → LightGBM/Random Forest → fishing vs. transit.

---

## Source table — by model

| Model | Dataset | Access | License | Size |
|---|---|---|---|---|
| **C. Fishing vs transit** | GFW training-data | git-lfs clone | CC-BY 4.0 | 770MB |
| **A. Border risk / B. Anomaly** | Danish Maritime Authority AIS | Direct HTTP, no login | Free (Danish PSI Act) | ~2GB/day |
| **A / B / D** | NOAA Marine Cadastre AIS | Direct or clip-and-ship | US public domain | Varies |
| **All — India-specific** | GFW APIs | Free API key | CC-BY-SA 4.0 | Query-based |

---

### 1. Danish Maritime Authority AIS — best free bulk source
**http://web.ais.dk/aisdata/** — direct HTTP index, no registration, no API key. Daily CSVs from 2006 to present.

Why it matters for you: the CSV includes a **`Navigational status`** field where vessels self-report `Engaged in fishing`. That's a free weak label for millions of points — enough to bootstrap Model C and train Model B (Isolation Forest) without any labeling effort.

Schema: `Timestamp, Type of mobile, MMSI, Latitude, Longitude, Navigational status, ROT, SOG, COG, Heading, IMO, Callsign, Name, Ship type, Cargo type, Width, Length, Draught, Destination, ETA`

That's `SOG`, `COG`, `Heading`, and `ROT` — precisely the inputs your feature list needs (`closing_speed_to_imbl`, `heading_variance`, etc.).

**Warning on size:** one day ≈ 2GB / ~10M rows; a year ≈ 700GB. Start with 3–7 days, filter to `Ship type = Fishing`, and load through PostGIS + TimescaleDB — which is your stack anyway, so this doubles as a realistic load test.

Useful reference: https://github.com/gma2th/aisdk — someone did exactly your task (illegal-fishing scoring on DMA data using Postgres + PostGIS + TimescaleDB, including distance-from-land via PostGIS nearest-neighbor). Worth reading before you write your own pipeline.

### 2. NOAA Marine Cadastre — cleanest, most analysis-ready
- **Bulk/GeoParquet (2024–25, recommended):** https://github.com/ocm-marinecadastre/ais-vessel-traffic
- **Clip-and-ship by area/time (~2GB cap):** https://marinecadastre.gov/accessais/
- Coverage 2009–2025, 1-minute filtered, US EEZ, public domain.

GeoParquet loads far faster than CSV and is the better choice for iterating on features.

### 3. Global Fishing Watch APIs — the only India-specific option
**https://globalfishingwatch.org/our-apis/** — free key.
- **Events API** — fishing events, encounters, loitering, port visits, **AIS-disabling events** (directly relevant to your anomaly model)
- **4Wings API** — gridded fishing effort rasters
- **Vessels API** — identity/registry
- R client: https://github.com/GlobalFishingWatch/gfwr

Query by EEZ code for India and Sri Lanka to get Palk Bay / Gulf of Mannar coverage. This is the **only** source here that gives you data from your actual operating area.

### 4. GFW reference implementations (read before building)
- **https://github.com/GlobalFishingWatch/vessel-scoring** — the library this labeled dataset was built for; includes a Logistic/Random Forest baseline you can benchmark against.
- **https://github.com/GlobalFishingWatch/vessel-classification** — production CNN approach (your Tier 2E reference).
- **https://github.com/GlobalFishingWatch/AIS-disabling-high-seas** — boosted regression trees for AIS-disabling detection. **This is the closest published analogue to your Model A**: same algorithm class (BRT ≈ gradient boosting), same problem shape.

---

## Recommended acquisition order

1. **`gfw_labels/` (already in hand)** — build your feature pipeline and `GroupKFold` harness today against real label structure. No download needed.
2. **`git lfs clone` GFW training-data** — completes Model C. One command, ~770MB.
3. **DMA AIS, 3–7 days, fishing vessels only** — gives Models A and B real kinematics at volume, and exercises your PostGIS/TimescaleDB ingest.
4. **GFW API key → Palk Bay query** — the domain-transfer step. Fine-tune on Indian waters.

---

## Two honest caveats

**Geographic transfer.** All bulk sources are North Atlantic / US / Danish waters — trawlers and longliners, mostly >15m vessels with mandatory AIS. Your users are small Tamil Nadu fishing boats, many without AIS at all, which is why your project uses LoRa in the first place. Kinematic signatures of fishing do transfer reasonably (slow + erratic + repeated turns is universal), but **vessel scale and behavior do not**. Train on bulk data, then fine-tune on GFW's Indian Ocean coverage, and validate honestly against whatever real Palk Bay data you can obtain.

**Label semantics.** GFW labels are `fishing` vs `not fishing` — *not* `legal` vs `illegal`. Illegality is a function of position relative to the IMBL and zone rules, which your PostGIS layer determines, not the model. Keep these two decisions separate in your architecture: the model says *"this vessel is fishing"*, PostGIS says *"here"*, and the rule engine combines them. Conflating them produces a model that can't be audited — and an alert a Coast Guard officer can't justify.
