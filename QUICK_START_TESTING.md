# Quick Start — Testing the AI Engine Dashboard

## 🎬 Live Test (Right Now!)

### 1. Access the Application
```
URL: http://localhost:5175
```

### 2. Coast Guard Login
- Click **"Coast Guard Portal"** button
- Authenticate (any credentials for demo)

### 3. Navigate to Engine Dashboard
- You'll see the **AI Engine Control Center** below the World Map
- Three tabs visible: **Telemetry | Recommendations | Threat Sandbox**

---

## 📊 Tab 1: TELEMETRY

### What You'll See
- **System Health Score**: Top-right badge (should be 90%+)
- **Engine List**: All 12 engines with mini metrics
- **Sorting Options**: Latency, Accuracy, Throughput buttons
- **Details Panel**: Click any engine to see full metrics

### Try This
1. Click "Anomaly Detector" from the list
2. View its:
   - **Latency**: 2.3ms (how fast it runs)
   - **Accuracy**: 85% (detection precision)
   - **Throughput**: 500/sec (items processed)
   - **Error Rate**: 2% (failure percentage)

3. Click "Refresh" button
4. Watch metrics update in real-time

### What It Means
These metrics show the 12 AI engines are running smoothly. If Error Rate > 10% or Latency > 100ms, the engine needs attention.

---

## 🚨 Tab 2: RECOMMENDATIONS

### What You'll See
- **Priority Levels**: Critical, High, Medium, Low
- **Active Alerts**: Real-time recommendations from engines
- **Confidence Scores**: 0-100% indicating alert reliability
- **Target Vessels**: Which boat(s) the alert concerns

### Example Recommendations
```
🔴 CRITICAL | INTERCEPT: Send patrol vessel to VESSEL-001
   Confidence: 92%
   "High anomaly score. Immediate interception recommended."

🟠 HIGH | MONITOR: Track VESSEL-003 closely
   Confidence: 75%
   "Moderate anomaly detected. Close monitoring recommended."

🟡 MEDIUM | ALERT: Suspected coordinated activity
   Confidence: 85%
   "3 vessels forming close pattern..."
```

### Filter Buttons
- **All**: Show all active recommendations
- **Critical**: Only 🔴 level (most urgent)
- **High**: Only 🟠 level

### Try This
1. Filter by "Critical" 
2. Find highest confidence alert
3. Click "Dismiss" to remove alert
4. Watch it disappear from list

---

## 🧪 Tab 3: THREAT SANDBOX

### What You'll See
- **Test Case Manager**: 5 built-in anomaly scenarios
- **Test Results Terminal**: Real-time execution output
- **Pass Rate Badge**: Shows accuracy (target: 100%)
- **Test History**: Shows previous runs

### 5 Test Cases

| # | Name | Scenario | Expect |
|---|------|----------|--------|
| 1 | Zigzag | Erratic course changes | ✓ Anomaly |
| 2 | Loitering | 30+ min stationary | ✓ Anomaly |
| 3 | Speed Spike | Sudden acceleration | ✓ Anomaly |
| 4 | Night Fishing | 20:00-04:00 in zone | ✓ Anomaly |
| 5 | Rapid Approach | High-speed intercept | ✓ Anomaly |

### Run a Test
1. **Select Test Case**: Click "1. Zigzag Pattern"
2. **Start Test**: Click green "Run Test" button
3. **Watch Terminal**: Shows real-time output:
   ```
   TEST: Zigzag Pattern
   SCENARIO: zigzag
   EXPECTED: Anomaly Detected
   ACTUAL: Anomaly Detected
   RESULT: ✓ PASSED
   CONFIDENCE: 89.2%
   ```

4. **Review Results**: 
   - ✓ Green = PASSED
   - ✗ Red = FAILED

### Validate Detector Accuracy
Run all 5 tests → Check Pass Rate → Should be 100%

If <100%, potential issues:
- ML model degradation
- Threshold miscalibration
- Sensor data quality

---

## 🎯 Bottom Footer Stats

```
Engines: 12/12 | Active Recommendations: 6 | Health: 92%
Last Update: 14:30:45 UTC
```

### What Each Means
- **Engines 12/12**: All AI engines operational
- **Recommendations 6**: Currently 6 active alerts for operators
- **Health 92%**: System performing at 92% capacity
- **Last Update**: Real-time update timestamp

---

## 🔄 Real-Time Behavior

### Every 1 Second
- Telemetry metrics update
- Engine execution stats refresh
- Latency counters tick

### Every 3 Seconds
- New recommendations generated
- Vessel threat reassessment
- Anomaly scores recalculated

### On "Run Test"
- Synthetic vessel created
- Anomaly detector executes
- Results displayed in terminal
- Test recorded in history

---

## 🎓 Learning Path

### For New Operators
1. **Day 1**: Explore Telemetry tab
   - Understand what each engine does
   - Learn normal metric baselines

2. **Day 2**: Study Recommendation tab
   - Review sample alerts
   - Practice filtering by priority
   - Understand vessel tracking

3. **Day 3**: Use Threat Sandbox
   - Run all 5 test cases
   - Validate detector accuracy
   - Learn confidence scoring

### For System Admins
1. **Monitor Health Score**
   - Target: ≥90%
   - Alert threshold: <70%

2. **Track Error Rates**
   - Flag any engine > 10% errors
   - Review telemetry history for patterns

3. **Optimize Thresholds**
   - Use sandbox to validate changes
   - A/B test new detector parameters

---

## 🆘 Troubleshooting

### Dashboard Not Showing
- Refresh page (F5)
- Check browser console for errors
- Verify you're logged in as Coast Guard

### Metrics All Zero
- May take 30 seconds to populate
- Click "Refresh" button in Telemetry tab
- Check that vessels are being tracked

### Tests Not Running
- Ensure at least one vessel is tracked
- Check browser console for JavaScript errors
- Try test #1 first (most reliable)

### Recommendations Not Updating
- Wait 3 seconds for next cycle
- Check if vessels have anomalies
- Low anomaly = fewer recommendations

---

## 📱 Mobile View

Dashboard is responsive but works best on:
- Desktop (Full featured)
- Tablet (Good)
- Mobile (Limited, use desktop)

---

## 🎬 Demo Scenario

### Complete Walkthrough (5 minutes)

1. **Login** (30 sec)
   - Select Coast Guard
   - Authenticate

2. **Explore Telemetry** (1 min)
   - Open Telemetry tab
   - Click on 3 different engines
   - Note the metrics

3. **Check Recommendations** (1 min)
   - Open Recommendations tab
   - Filter by "Critical"
   - Understand the recommendation text

4. **Run Sandbox Test** (2 min)
   - Open Threat Sandbox tab
   - Select "Rapid Approach" test
   - Click "Run Test"
   - Review output
   - Check pass rate

5. **Review Results** (30 sec)
   - Note the test passed
   - Understand confidence score
   - See how detector validated input

---

## ✨ Key Capabilities Demonstrated

✅ **Real-Time Monitoring** — Metrics update every second  
✅ **Multi-Engine Tracking** — All 12 engines visible  
✅ **Smart Recommendations** — AI-generated threat alerts  
✅ **Threat Validation** — Test detector accuracy  
✅ **Confidence Scoring** — Know how sure the AI is  
✅ **Historical Tracking** — Review past tests & metrics  

---

**Ready? Open http://localhost:5175 and start exploring!** 🚀
