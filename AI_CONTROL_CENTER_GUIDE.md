# AI Engine Control Center — Sub-Tab Guide

## 📋 Overview

The **AI Engine Control Center** is a comprehensive management dashboard for all 12 AI engines within the Coast Guard Portal. It features a tabbed sub-navigation system that allows operators to access different aspects of the AI system from a single unified interface.

**Location**: Coastal Guard Portal → Main Dashboard → World Map → AI Engine Control Center

---

## 🎯 Key Features

### 1. **Unified Control System**
- Single entry point for all 12 AI engines
- Real-time health monitoring
- Live alert management
- Interactive threat testing

### 2. **Sub-Tab Navigation**
Four main operation tabs:
- **Telemetry** — Engine health & performance metrics
- **Recommendations** — AI-generated threat alerts
- **Threat Sandbox** — Threat detection testing
- **Engine Stats** — Detailed analytics & history

### 3. **System Status Header**
- Overall health score (0-100%)
- System status badge (🟢 Operational | 🟡 Warning | 🔴 Critical)
- Quick metrics display:
  - Active Engines: 12/12
  - Pending Alerts: Live count
  - System Uptime: 99.8%

---

## 📊 Sub-Tab Breakdown

### Tab 1: Telemetry Dashboard

**Purpose**: Real-time visualization of all 12 engine health metrics

**Features**:
- **Engine List Panel** (Left)
  - Click any engine to view detailed metrics
  - Color-coded health indicators
  - 3 sorting options:
    - Sort by Latency (ms) — Fastest to slowest engines
    - Sort by Accuracy (%) — Most to least accurate
    - Sort by Throughput — Highest to lowest items/sec

- **Metrics Displayed**:
  - **Latency**: Engine execution time in milliseconds (goal: <100ms)
  - **Accuracy**: Detection/prediction accuracy percentage (goal: >85%)
  - **Throughput**: Items processed per second (goal: >5/sec)
  - **Error Rate**: Percentage of failed executions (goal: <2%)
  - **CPU Usage**: Processor utilization percentage
  - **Memory Usage**: RAM consumption in MB

- **Detail Panel** (Right)
  - Shows comprehensive metrics for selected engine
  - Progression bars for each metric
  - Historical trend indicators
  - Refresh rate: 1 second

**Tracked Engines** (All 12):
```
Phase 1 (Core Detection):
├─ Anomaly Detector
├─ Cluster Engine
└─ Kalman Filter

Phase 2 (Real-time Processing):
├─ LoRA Simulator
├─ Geofence Engine
└─ Store & Forward Buffer

Phase 3 (Advanced Analytics):
├─ TensorFlow Anomaly
├─ Vector Search (WASM)
└─ Recommendation Engine

Phase 4 (Security):
├─ Blockchain Integrity
├─ Edge Computing
└─ Adversarial Robustness
```

---

### Tab 2: Recommendations Panel

**Purpose**: Display and manage AI-generated threat alerts

**Features**:
- **Priority Filtering**
  - Filter buttons: All | Critical | High
  - Auto-sorts by priority level
  - Color-coded alerts:
    - 🔴 **CRITICAL**: Immediate action required
    - 🟠 **HIGH**: Urgent investigation
    - 🟡 **MEDIUM**: Monitor closely
    - 🔵 **LOW**: Informational

- **Alert Information**
  - Vessel target identification
  - Confidence score (0-100%)
  - Threat description
  - Time since alert generated

- **Alert Management**
  - Dismiss individual alerts
  - Clear all alerts
  - Auto-expire after 15 minutes (TTL)

- **Recommendation Sources**
  - Anomaly Detection Engine
  - Behavioral Analysis
  - Geofence Violations
  - Risk Model Scoring

**Update Cycle**: 3 seconds (new recommendations checked constantly)

---

### Tab 3: Threat Sandbox

**Purpose**: Test and validate threat detection accuracy

**Features**:
- **Built-in Test Scenarios** (5 Total)
  1. **Zigzag Pattern** — Erratic vessel heading changes
     - Expected: ✅ Anomaly detected
     - Confidence: High
  
  2. **Loitering Behavior** — Vessel stationary >30 minutes
     - Expected: ✅ Anomaly detected
     - Confidence: High
  
  3. **Speed Spike** — Sudden acceleration >10 knots/min
     - Expected: ✅ Anomaly detected
     - Confidence: Very High
  
  4. **Night Fishing** — Illegal fishing between 20:00-04:00 in IMBL
     - Expected: ✅ Anomaly detected
     - Confidence: High
  
  5. **Rapid Approach** — High-speed intercept trajectory
     - Expected: ✅ Anomaly detected
     - Confidence: Very High

- **Test Execution**
  - Click "Run Test" to execute scenario
  - Anomaly detector processes synthetic vessel
  - Results display in terminal-style output
  - Confidence score visualization

- **Performance Metrics**
  - Execution time in milliseconds
  - Anomaly score (0-100)
  - Pass/Fail indicator
  - Detailed reasoning

- **Historical Tracking**
  - Recent 20 test runs stored
  - Pass rate calculation: X/Y scenarios passed
  - Timestamps for each execution
  - Export capability for audit trails

---

### Tab 4: Engine Stats

**Purpose**: Detailed performance analytics and historical data

**Features**:
- **Performance Grid** (First 6 Engines Visible)
  - Each engine displayed in card format
  - 4 key metrics per engine:
    - Latency (ms)
    - Accuracy (%)
    - Throughput (/sec)
    - Errors (%)

- **Drill-Down Capability**
  - Click any engine for full history
  - View performance trends over time
  - Compare metrics across engines
  - Export data for analysis

- **Historical Data Summary**
  - Total executions logged (last 5 minutes)
  - Average health score
  - Critical events count
  - Anomalies detected

- **Analytics Insights**
  - System performance trends
  - Peak usage times
  - Bottleneck identification
  - Recommendations for optimization

---

## 🎮 Operating Procedures

### Quick Start (30 seconds)

1. **Access Control Center**
   - Log in to Coast Guard Portal
   - Navigate to Main Dashboard
   - Control Center appears below World Map

2. **Check System Health**
   - Look at status badge in header
   - Green = Operational ✅
   - Yellow = Warning ⚠️
   - Red = Critical 🚨

3. **Review Current Alerts**
   - Click "Recommendations" tab
   - Sort by Critical/High
   - Dismiss reviewed alerts

### Daily Monitoring (5 minutes)

1. **Telemetry Review**
   - Click "Telemetry" tab
   - Check all engines show green health
   - Note any latency spikes

2. **Alert Check**
   - Switch to "Recommendations" tab
   - Filter for "Critical" only
   - Address any active threats

3. **System Status**
   - Verify health score >90%
   - Confirm 12/12 engines active
   - Note uptime percentage

### Threat Validation (10 minutes)

1. **Run Test Suite**
   - Click "Threat Sandbox" tab
   - Execute all 5 test scenarios
   - Verify 5/5 pass

2. **Analyze Results**
   - Review confidence scores
   - Check execution times (<300ms target)
   - Export results if necessary

---

## 🔧 Configuration & Settings

### Header Status Bar Components

```
┌────────────────────────────────────────────────────────────┐
│ 🔧 AI ENGINE CONTROL CENTER [Status: 🟢 OPERATIONAL]     │
├────────────┬─────────────────┬──────────────┬─────────────┤
│ HEALTH: 92%│ ENGINES: 12/12 │ ALERTS: 4    │ UPTIME: 99.8%│
└────────────┴─────────────────┴──────────────┴─────────────┘
```

### Control Panel Footer

- **Config Button** — Access engine tuning parameters
- **Export Report** — Generate PDF/CSV of current session
- **Live Status Indicator** — Pulsing green dots = active monitoring

---

## 📈 Performance Targets

| Metric | Target | Warning | Critical |
|--------|--------|---------|----------|
| Health Score | >90% | 75-90% | <75% |
| Latency (per engine) | <100ms | 100-200ms | >200ms |
| Accuracy | >85% | 75-85% | <75% |
| Error Rate | <2% | 2-5% | >5% |
| System Uptime | >99% | 95-99% | <95% |
| Engine Count | 12/12 | 10-11/12 | <10/12 |

---

## 🚨 Alert Level Definitions

### 🔴 CRITICAL
- **Response Time**: Immediate (0-5 min)
- **Examples**:
  - Vessel attempting intercept
  - Geofence breach with speed surge
  - Spoofing attack detected
  - System anomaly threshold exceeded

### 🟠 HIGH
- **Response Time**: Urgent (5-30 min)
- **Examples**:
  - Unusual vessel behavior pattern
  - Multiple geofence violations
  - High-risk vessel detected
  - Coordinated vessel activity

### 🟡 MEDIUM
- **Response Time**: Standard (30 min-2 hrs)
- **Examples**:
  - Slow speed anomaly
  - Minor geofence violation
  - Moderate risk score increase
  - Equipment malfunction detected

### 🔵 LOW
- **Response Time**: Routine (>2 hrs)
- **Examples**:
  - System maintenance notice
  - Performance metric update
  - Informational status change
  - Training scenario alert

---

## 🧪 Testing Guide

### Manual Test Procedure

**Objective**: Validate all 5 threat scenarios detected correctly

**Steps**:
1. Navigate to Threat Sandbox tab
2. Click "Run Test" for each scenario
3. Record results:
   ```
   Scenario 1 (Zigzag): [PASS/FAIL] Confidence: XX%
   Scenario 2 (Loiter): [PASS/FAIL] Confidence: XX%
   Scenario 3 (Speed Spike): [PASS/FAIL] Confidence: XX%
   Scenario 4 (Night Fishing): [PASS/FAIL] Confidence: XX%
   Scenario 5 (Rapid Approach): [PASS/FAIL] Confidence: XX%
   ```

4. **Success Criteria**: 5/5 PASS with average confidence >80%

**Troubleshooting**:
- If any test fails, check anomaly detector engine health in Telemetry tab
- Verify latency <300ms for each execution
- Check error rate not exceeding 5%

---

## 📱 Mobile/Responsive Handling

The Control Center is optimized for:
- **Desktop** (Primary): Full 4-tab interface with all metrics
- **Tablet**: Stacked tabs with scrollable content
- **Mobile**: Tab-based navigation with essential metrics only

**Recommended Minimum Screen Size**: 1024x768 (1366x768 optimal)

---

## 🔌 Integration Points

### Telemetry Data Flow
```
All 12 Engines
    ↓
TelemetryEngine (Singleton)
    ↓
Real-time Snapshots (1 sec)
    ↓
TelemetryDashboard Component
    ↓
Operator Display
```

### Recommendation Flow
```
Kalman Filter → Anomaly Detector → Recommendation Engine
    ↓
Queue with Priority (Critical/High/Medium/Low)
    ↓
TTL-based Expiration (15 min)
    ↓
RecommendationPanel Component
    ↓
Operator Alerts
```

### Threat Testing Flow
```
Test Scenario Selection
    ↓
Synthetic Vessel Generation
    ↓
Anomaly Detector Execution
    ↓
Confidence Scoring
    ↓
Results Display
    ↓
Historical Recording (20 recent runs)
```

---

## 💾 Data Persistence

- **Telemetry Snapshots**: Last 5 minutes (300 samples at 1Hz)
- **Recommendations**: Active alerts only; 15-minute TTL
- **Test Results**: Last 20 executions stored in memory
- **User Preferences**: Tab selection saved to browser localStorage

---

## 🎓 Operator Training Roadmap

### Day 1: Fundamentals (2 hours)
- ✅ System overview and safety briefing
- ✅ Navigate all tabs
- ✅ Understand status indicators
- ✅ Read health metrics

### Day 2: Operations (3 hours)
- ✅ Filter and manage alerts
- ✅ Run threat detections
- ✅ Interpret confidence scores
- ✅ Handle critical scenarios

### Day 3: Advanced (2 hours)
- ✅ Performance optimization
- ✅ Historical data analysis
- ✅ Export and reporting
- ✅ Incident documentation

**Total Training**: 7 hours (3-day program)

---

## 📞 Support & Troubleshooting

### Common Issues

**Problem**: Health score drops below 75%
- **Action**: Check Telemetry tab for engine with errors
- **Resolution**: Verify all 12 engines listed; restart if necessary

**Problem**: Alerts not updating
- **Action**: Verify Recommendations tab refresh rate (3 sec)
- **Resolution**: Hard refresh browser (Ctrl+Shift+R)

**Problem**: Threat test shows low confidence
- **Action**: Review anomaly detector accuracy in Telemetry
- **Resolution**: May indicate need for model retraining

**Problem**: Control Center not visible
- **Action**: Verify you're logged in as Coast Guard user
- **Resolution**: Check session storage; re-authenticate

---

## 📋 Customization & Extension

### Adding New Test Scenarios
Located in `ThreatSandbox.tsx` → `TEST_CASES` array:
```typescript
{
  id: 6,
  name: 'Custom Threat Pattern',
  description: 'Your custom threat description',
  // ... vessel data parameters
}
```

### Adding New Engine Metrics
Update `TelemetryEngine` class in `telemetryEngine.ts`:
```typescript
recordExecution(engineName, durationMs, success, itemsProcessed);
updateAccuracy(engineName, accuracyPercentage);
```

### Customizing Alert Priorities
Modify `recommendationEngine.ts` priority system to adjust alert classifications.

---

## 📊 Metrics Glossary

| Term | Definition | Unit | Target |
|------|-----------|------|--------|
| **Latency** | Time from input to output | ms | <100 |
| **Throughput** | Items processed per second | /sec | >5 |
| **Accuracy** | Correct predictions/detections | % | >85 |
| **Error Rate** | Failed executions | % | <2 |
| **Health Score** | Overall system wellness | 0-100% | >90 |
| **Confidence** | Alert reliability measure | % | >75 |
| **TTL** | Time before alert expiration | min | 15 |

---

## 🔐 Security Features

- **End-to-End Audit Trail**: All engine operations logged
- **Blockchain Integrity**: Tamper detection via cryptographic signing
- **Rate Limiting**: Engine calls throttled to prevent abuse
- **Role-Based Access**: Coast Guard personnel only
- **Session Management**: Automatic logout after 30 min inactivity
- **Encrypted Communications**: HTTPS only for prod deployment

---

## 📝 Deployment Checklist

- [ ] All 12 engines operational and tested
- [ ] Telemetry recording for Kalman, Geofence, Anomaly detectors
- [ ] Recommendation engine generating valid alerts
- [ ] All 5 threat sandbox scenarios passing
- [ ] Health score maintained >90%
- [ ] Build completes with 0 errors
- [ ] Dev server launches without issues
- [ ] Operator training completed
- [ ] Documentation reviewed and approved
- [ ] Ready for production deployment ✅

---

**Status**: ✅ **PRODUCTION READY**  
**Last Updated**: April 6, 2026  
**Version**: 1.0

For additional support or updates, refer to:
- `INTEGRATION_COMPLETE.md` — Full architecture guide
- `QUICK_START_TESTING.md` — Operator testing walkthrough
- `ENGINES_ARCHITECTURE.md` — Engine implementation details
