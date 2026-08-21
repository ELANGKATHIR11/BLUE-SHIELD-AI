# 🛡️ Blue Shield AI (MarOS™) — Next-Gen Maritime Safety & AI Geofence System

[![React](https://img.shields.io/badge/React-19.2.8-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-7.0.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-8.2.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-PostCSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![PostGIS](https://img.shields.io/badge/PostGIS-Spatial%20DB-336791?style=for-the-badge&logo=postgresql&logoColor=white)](https://postgis.net/)
[![Language](https://img.shields.io/badge/Language-English%20%7C%20%E0%AE%A4%E0%AE%AE%E0%AE%BF%E0%AE%B4%E0%AF%8D-blue?style=for-the-badge)](#-bilingual-uiux--voice-ai-english--tamil)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg?style=for-the-badge)](#-proprietary-license)

**Blue Shield AI** is an advanced Maritime Operating System (MarOS) designed to safeguard fishermen operating in sensitive border waters (Palk Strait / Indian Ocean) and provide real-time tactical surveillance for maritime defense forces (Indian Coast Guard).

---

## 📐 End-to-End System Architecture

```mermaid
flowchart TB
    subgraph Client [Frontend Workspace — React 19 + TypeScript + Vite]
        direction TB
        subgraph Portals [Dual Workspace Portals]
            FP[Fisherman Safety Portal]
            CG[Coast Guard Tactical Command]
        end
        
        subgraph Engines [Edge AI & Geospatial Engines]
            KF[Kalman Filter Trajectory Estimator]
            LR[Logistic Regression Risk Engine]
            AD[Neural Anomaly Detector]
            GF[Spatial Geofence Checker]
            LR_SIM[LoRa Telemetry Simulator & Buffer]
        end

        subgraph UX [Immersive Bilingual UI Layer]
            LANG[Bilingual Engine: English | தமிழ்]
            TTS[Bilingual TTS & Speech-to-Text]
            MAP[HTML5 Canvas GIS Map / Leaflet]
            A3D[3D Motion & Glassmorphism System]
        end
    end

    subgraph Cloud [Cloud & Telemetry Layer]
        FS[(Firebase Firestore DB)]
        GEMINI[Gemini Generative AI Engine]
    end

    subgraph Backend [Spatial PostGIS Backend API]
        EXPRESS[Express API Gateway]
        PG[(PostgreSQL + PostGIS)]
    end

    FP -->|Live Device GPS| Engines
    CG -->|Live Patrol GPS| Engines
    Engines -->|Calculated Risk & Anomalies| UX
    Engines -->|Real-time Subscriptions| FS
    Engines -->|LoRa Fallback Packets| LR_SIM
    Engines -->|Spatial Queries & Telemetry| EXPRESS
    EXPRESS -->|ST_Contains / ST_Distance| PG
    Engines -->|Contextual Analysis| GEMINI
```

---

## ✨ Core Features & Technical Highlights

### 1. 🌐 Full Bilingual UI/UX & Voice AI (English & தமிழ்)
- **1-Click Dynamic Language Switch**: Instant full-application localization between **English** and **Tamil (தமிழ்)** across all dashboards, alerts, metrics, tables, and buttons without page reloads.
- **Voice Dictation (Speech-to-Text)**: Automatically adapts microphone transcription language between `ta-IN` (Tamil) and `en-US` (English).
- **Text-to-Speech (TTS Engine)**: Reads out voice dispatches and safety alerts in spoken Tamil or English.

### 2. 🛰️ Real-Time System GPS Geolocation
- **Direct Hardware Geolocation**: Integrates `navigator.geolocation.watchPosition` with high accuracy (`maximumAge: 0`) to stream real device coordinates for:
  - **Fisherman Vessels**: Real-time speed (knots), heading, and distance-to-border monitoring.
  - **Coast Guard Patrol Vessels**: Live tactical GPS plotting and tracking.

### 3. 🧠 4-Layer Edge AI Surveillance & Anti-Jitter Pipeline
- **L1: Spatial Geofence Boundary Check**: Real-time Euclidean & polygonal distance calculations against the International Maritime Boundary Line (IMBL).
- **L2: Kalman Filter Trajectory Predictor**: Noise reduction and rolling state estimation to forecast vessel pathing $N$ minutes ahead.
- **L3: Machine Learning Risk Assessment**: Hand-tuned Logistic Regression and heuristic anomaly detection scoring (0–100%).
- **L4: Gemini Generative AI Re-Analysis**: Context-aware bilingual safety recommendations.
- **Pipeline Throttling**: Micro-delta coordinate and time throttling prevents frontend shuttering and flickering during rapid GPS polling.

### 4. 🎨 3D Motion Design & Glassmorphism
- **3D Perspective & Motion**: `perspective-1000`, 3D card tilts on hover (`cubic-bezier(0.175, 0.885, 0.32, 1.275)`), floating badges, radar sweeps, and frosted glass panels (`backdrop-filter: blur(16px)`).

### 5. 📡 LoRa Telemetry & Store-and-Forward Buffer
- **Hardware-Resilient Communications**: LoRa SX1278 (915MHz) simulator with AES-128-CTR encryption, packet compression, and offline store-and-forward caching when cellular coverage drops.

---

## 🛠️ Technology Stack

| Domain | Technologies |
|---|---|
| **Frontend Framework** | React 19 (`^19.2.8`), TypeScript 7, Vite 8 |
| **Routing & State** | React Router v7 (`^7.18.2`), Context API, Custom Hooks |
| **Styling & 3D Motion** | TailwindCSS, PostCSS, Custom 3D CSS Keyframes, Glassmorphism |
| **Mapping & GIS** | Leaflet (`^1.9.4`), React-Leaflet (`^5.0.0`), HTML5 Canvas |
| **Cloud & Realtime** | Firebase Firestore (`^12.17.1`), Firebase Auth, Google Generative AI |
| **Spatial Database** | PostgreSQL 16 + PostGIS extension, pg-promise |
| **Backend API** | Node.js, Express (`^4.19.2`), REST, CORS |
| **Telemetry & Comms** | Web Audio API, Web Speech Recognition API, LoRa Packet Engine |

---

## 🚀 Quick Start Guide

### Prerequisites
- **Node.js**: v18+ or v20+
- **NPM**: v9+

### Installation & Local Run

```bash
# 1. Clone the repository
git clone https://github.com/ELANGKATHIR11/BLUE-SHIELD-AI.git
cd BLUE-SHIELD-AI/finale/project

# 2. Install dependencies
npm install

# 3. Start the development server
npm run dev
```

Open [http://localhost:5173/](http://localhost:5173/) in your browser.

### Production Build

```bash
npm run build
npm run preview
```

---

## 🔒 Proprietary License & Intellectual Property

**COPYRIGHT (C) 2026 ELANGKATHIR11. ALL RIGHTS RESERVED.**

This project, its source code, architecture, algorithms (Kalman filter spatial trajectory, bilingual voice telemetry dispatch, PostGIS border geofencing, and LoRa buffer mechanisms), datasets, and documentation are **strictly proprietary and confidential**.

- Commercial duplication, distribution, reverse engineering, scraping, or modification is **strictly prohibited**.
- The codebase belongs solely and exclusively to the author & inventor: **[Elangkathir](https://github.com/ELANGKATHIR11)**.