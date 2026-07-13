# 🛡️ Blue Shield AI — Coast Guard Monitoring & GIS Spatial Engine

A premium, state-of-the-art real-time vessel monitoring, collision prevention, and communication system integrated with **PostgreSQL**, **PostGIS spatial intelligence**, **Firebase Firestore**, and **Lightweight GIS boundaries**.

> [!WARNING]
> **PROPRIETARY & CONFIDENTIAL LICENSE**
> This project is strictly prohibited for public use. The source code, spatial datasets, backend models, and documentation belong exclusively to the repository owner (**ELANGKATHIR11**). Unauthorized copying, distribution, hosting, or modification is illegal under international intellectual property law.

---

## 📐 Architecture Diagram

```mermaid
graph TD
    subgraph Client [React SPA Frontend]
        UI[Interactive Leaflet Map]
        WT[Vessel Tracker & Kalman Filter]
        AD[Anomaly Detector]
        BA[Boundary Alerts Engine]
        GEO[react-leaflet GeoJSON Layers]
    end

    subgraph External [External Services]
        FB[(Firebase Firestore DB)]
    end

    subgraph Backend [Express PostGIS Server]
        API[Express Router]
        DB[(PostgreSQL Database)]
        GIS[PostGIS Spatial Queries]
    end

    UI -->|GPS Coordinates| WT
    WT -->|Filtered Telemetry| API
    WT -->|Filtered Telemetry| FB
    BA -->|Fetch simplified borders| GEO
    API -->|Insert logs / ST_Contains| DB
    DB -->|Spatial calculations| GIS
    GIS -->|EEZ Violations / Distance| API
    API -->|Boundary Alarms| UI
```

---

## 🚀 Key Systems & Core Features

### **1. PostGIS Spatial Database & Backend Integration**
- **Spatial Schema Engine**: Custom Node.js Express server running at port `5000` connected to PostgreSQL + PostGIS.
- **Real-Time Geofence Checks**: Uses PostGIS `ST_Contains` on polygons to check if coordinates violate borders, and `ST_Distance` to check distance.
- **Dynamic Seeding**: Automatically checks/installs the `postgis` extension, creates spatial schemas, and seeds boundaries directly from WFS GeoJSON files on boot.

### **2. Premium GIS Map Integration**
- **Lightweight Rendering**: Large 97 MB GIS shapefiles simplified/decimated down to lightweight GeoJSONs (e.g., 4.4 MB for Sri Lanka) to run instantly in browsers without thread lag.
- **HTML5 Canvas Accelerated**: Leaflet's `preferCanvas={true}` enabled for ultra-smooth 60fps pan/zoom interactions.
- **India-Near Regional Bounds**: Constrained maps to the Indian subcontinent ocean regions (`[[0.0, 60.0], [30.0, 100.0]]`) to focus operations.
- **Adaptive Auto-Panning**: Custom thresholding disables auto-centering unless a vessel travels >20m, preventing annoying jitter.

### **3. Fisherman & Patrol Console**
- **Fisherman Portal**: One-tap registration, live high-accuracy GPS telemetry synchronizations to both Firebase & PostGIS, and immediate visual warnings on crossing EEZs.
- **Coast Guard Control Center**: Smart cluster modeling using DBSCAN, automatic patrol route setups, message dispatchers, and automated alarm systems.

---

## 🛠️ Technical Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Maps**: Leaflet + React-Leaflet (HTML5 Canvas rendering)
- **Database (Cloud)**: Firebase Firestore (real-time subscriptions)
- **Database (Spatial)**: PostgreSQL + PostGIS (Docker / Local)
- **Backend API**: Node.js Express + pg-promise
- **GIS Processing**: Python (Shapely + Decimation scripts)

---

## 📦 Deployment & Startup Instructions

### 1. Start the PostGIS Backend Server
1. Navigate to the backend directory:
   ```bash
   cd project/backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Update database credentials in `.env`:
   ```env
   PORT=5000
   DATABASE_URL=postgresql://postgres:Akilaarasu1!@localhost:5432/postgres
   CORS_ORIGIN=http://localhost:5173
   ```
4. Start the server:
   ```bash
   npm run dev
   ```

### 2. Start the Frontend client
1. Navigate to the client directory:
   ```bash
   cd project
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```
4. Open the browser at [http://localhost:5173/](http://localhost:5173/).

---

## 🔒 License
**PRIVATE LICENSE** — Prohibited for public distribution, replication, or hosting. All code belongs strictly to the repository owner **ELANGKATHIR11**.