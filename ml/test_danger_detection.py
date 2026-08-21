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
Test Danger Detection with More Extreme Scenarios
Tests the retrained model specifically for danger classification
"""

import tensorflow as tf
from tensorflow import keras
import numpy as np
import joblib
import json

print("="*80)
print("DANGER DETECTION FOCUSED TEST")
print("="*80)

# Load model and scaler
model = keras.models.load_model('models/vessel_behavior_model.h5', compile=False)
scaler = joblib.load('models/vessel_behavior_model_scaler.pkl')

print("\n✅ Model and scaler loaded")

# Create extreme danger scenarios that should definitely be classified as danger
danger_scenarios = [
    {
        'name': 'Extreme Speed Night Racing',
        'speed': 35.0,
        'heading': 90,
        'speed_change': 10.0,
        'heading_change': 25,
        'distance_moved': 15.0,
        'time_delta': 180,
        'hour_of_day': 2,
        'day_of_week': 3
    },
    {
        'name': 'Rapid Evasive Maneuvers',
        'speed': 28.0,
        'heading': 180,
        'speed_change': 8.0,
        'heading_change': 90,
        'distance_moved': 12.0,
        'time_delta': 150,
        'hour_of_day': 23,
        'day_of_week': 5
    },
    {
        'name': 'High Speed Prohibited Zone Approach',
        'speed': 32.0,
        'heading': 45,
        'speed_change': 12.0,
        'heading_change': 15,
        'distance_moved': 18.0,
        'time_delta': 200,
        'hour_of_day': 1,
        'day_of_week': 6
    },
    {
        'name': 'Chase Pattern - Aggressive Pursuit',
        'speed': 38.0,
        'heading': 270,
        'speed_change': 15.0,
        'heading_change': 35,
        'distance_moved': 20.0,
        'time_delta': 120,
        'hour_of_day': 22,
        'day_of_week': 0
    },
    {
        'name': 'Smuggling Pattern - Burst Speed',
        'speed': 40.0,
        'heading': 0,
        'speed_change': 18.0,
        'heading_change': 20,
        'distance_moved': 22.0,
        'time_delta': 100,
        'hour_of_day': 3,
        'day_of_week': 1
    }
]

# Prepare test data
X_test = []
for scenario in danger_scenarios:
    X_test.append([
        scenario['speed'],
        scenario['heading'],
        scenario['speed_change'],
        scenario['heading_change'],
        scenario['distance_moved'],
        scenario['time_delta'],
        scenario['hour_of_day'],
        scenario['day_of_week']
    ])

X_test = np.array(X_test)
X_test_scaled = scaler.transform(X_test)

# Get predictions
predictions = model.predict(X_test_scaled, verbose=0)

print("\n" + "="*80)
print("EXTREME DANGER SCENARIO RESULTS")
print("="*80)

danger_detected = 0
for i, scenario in enumerate(danger_scenarios):
    probs = predictions[i]
    predicted_class = np.argmax(probs)
    class_names = ['SAFE', 'WARNING', 'DANGER']
    
    print(f"\n🔥 Scenario {i+1}: {scenario['name']}")
    print(f"   Speed: {scenario['speed']} knots (EXTREME)")
    print(f"   Speed Change: {scenario['speed_change']} knots")
    print(f"   Heading Change: {scenario['heading_change']}°")
    print(f"   Time: {scenario['hour_of_day']}:00 (Late Night)")
    print(f"\n   Predicted: {class_names[predicted_class]} ({probs[predicted_class]*100:.2f}% confidence)")
    print(f"   Probabilities:")
    print(f"     - SAFE: {probs[0]*100:.2f}%")
    print(f"     - WARNING: {probs[1]*100:.2f}%")
    print(f"     - DANGER: {probs[2]*100:.2f}%")
    
    if predicted_class == 2:
        print("   ✅ CORRECTLY CLASSIFIED AS DANGER")
        danger_detected += 1
    else:
        print("   ❌ FAILED TO DETECT DANGER")

print("\n" + "="*80)
print(f"DANGER DETECTION RATE: {danger_detected}/5 ({danger_detected/5*100:.0f}%)")
print("="*80)

# Analyze class probabilities across training range
print("\n" + "="*80)
print("TESTING SPEED SENSITIVITY")
print("="*80)

test_speeds = [5, 10, 15, 20, 25, 30, 35, 40]
for speed in test_speeds:
    test_input = np.array([[
        speed,          # speed
        90,             # heading
        speed/3,        # speed_change
        20,             # heading_change
        speed*1.2,      # distance_moved
        180,            # time_delta
        22,             # hour_of_day (night)
        5               # day_of_week
    ]])
    
    test_scaled = scaler.transform(test_input)
    pred = model.predict(test_scaled, verbose=0)[0]
    predicted_class = np.argmax(pred)
    
    print(f"\nSpeed {speed} knots:")
    print(f"  Predicted: {['SAFE', 'WARNING', 'DANGER'][predicted_class]}")
    print(f"  Danger probability: {pred[2]*100:.2f}%")

print("\n" + "="*80)
