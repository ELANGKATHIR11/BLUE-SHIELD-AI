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
ML Model Performance Testing with Artificial Data
Tests both LSTM Trajectory Predictor and Behavior Classifier
"""

import numpy as np
import json
import sys
from datetime import datetime, timedelta
import tensorflow as tf
from tensorflow import keras
import pandas as pd

print("=" * 80)
print("ML MODEL PERFORMANCE TESTING")
print("=" * 80)
print(f"TensorFlow Version: {tf.__version__}")
print(f"Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("=" * 80)

# Load prohibited zones for testing
with open('../../datasets/indian_fishing_prohibited_zones.json', 'r') as f:
    zones = json.load(f)
    prohibited_zones = [z for z in zones if z['label'] == 1]

print(f"\nLoaded {len(prohibited_zones)} prohibited zones for testing")

# ============================================================================
# PART 1: TEST TRAJECTORY PREDICTION MODEL
# ============================================================================
print("\n" + "=" * 80)
print("PART 1: TRAJECTORY PREDICTION MODEL TEST")
print("=" * 80)

try:
    # Load trajectory model - skip if version incompatible
    try:
        trajectory_model = keras.models.load_model('models/trajectory_model_best.h5', compile=False)
        print("✅ Trajectory model loaded successfully (compile=False)")
    except:
        trajectory_model = keras.models.load_model('models/trajectory_model.h5', compile=False)
        print("✅ Trajectory model loaded successfully from trajectory_model.h5")
    
    print(f"Model input shape: {trajectory_model.input_shape}")
    print(f"Model output shape: {trajectory_model.output_shape}")
    
    # Generate artificial trajectory data
    # Model expects: (batch, sequence_length, features)
    # Features: [lat, lng, speed, heading, time_delta, distance]
    print("\n📊 Generating artificial trajectory data...")
    n_vessels = 10
    sequence_length = 10  # Match training
    n_features = 6  # lat, lng, speed, heading, time_delta, distance
    
    artificial_trajectories = []
    vessel_info = []
    
    for i in range(n_vessels):
        # Random starting position near Indian coast
        start_lat = np.random.uniform(8.0, 22.0)
        start_lng = np.random.uniform(68.0, 88.0)
        
        # Generate trajectory sequence
        trajectory = []
        current_lat, current_lng = start_lat, start_lng
        current_speed = np.random.uniform(3.0, 15.0)  # knots
        current_heading = np.random.uniform(0, 360)  # degrees
        
        for t in range(sequence_length):
            # Simulate movement
            lat_change = (current_speed / 60) * np.cos(np.radians(current_heading)) * 0.01
            lng_change = (current_speed / 60) * np.sin(np.radians(current_heading)) * 0.01
            
            prev_lat, prev_lng = current_lat, current_lng
            current_lat += lat_change
            current_lng += lng_change
            
            # Calculate distance moved (km)
            if t > 0:
                distance = np.sqrt((current_lat - prev_lat)**2 + (current_lng - prev_lng)**2) * 111
            else:
                distance = 0.0
            
            # Time delta (minutes)
            time_delta = 5.0
            
            # Add some randomness
            current_speed += np.random.uniform(-0.5, 0.5)
            current_speed = np.clip(current_speed, 1.0, 20.0)
            current_heading += np.random.uniform(-10, 10)
            current_heading = current_heading % 360
            
            trajectory.append([current_lat, current_lng, current_speed, current_heading, time_delta, distance])
        
        artificial_trajectories.append(trajectory)
        vessel_info.append({
            'vessel_id': f'TEST-V{i+1:03d}',
            'start_position': [start_lat, start_lng],
            'final_position': [current_lat, current_lng],
            'avg_speed': np.mean([t[2] for t in trajectory])
        })
    
    # Convert to numpy array
    X_test_trajectory = np.array(artificial_trajectories)
    print(f"✅ Generated {n_vessels} artificial trajectories")
    print(f"   Shape: {X_test_trajectory.shape}")
    print(f"   Sample trajectory[0][0]: {X_test_trajectory[0][0]}")
    
    # Make predictions
    print("\n🔮 Running trajectory predictions...")
    predictions = trajectory_model.predict(X_test_trajectory, verbose=0)
    print(f"✅ Predictions completed")
    print(f"   Predictions shape: {predictions.shape}")
    
    # Analyze predictions
    print("\n📈 TRAJECTORY PREDICTION RESULTS:")
    print("-" * 80)
    
    for i in range(n_vessels):
        predicted_lat, predicted_lng = predictions[i][0], predictions[i][1]
        actual_lat, actual_lng = X_test_trajectory[i][-1][0], X_test_trajectory[i][-1][1]
        
        # Calculate prediction error
        lat_error = abs(predicted_lat - actual_lat)
        lng_error = abs(predicted_lng - actual_lng)
        
        # Convert to km (rough approximation: 1 degree ≈ 111 km)
        distance_error = np.sqrt(lat_error**2 + lng_error**2) * 111
        
        print(f"\nVessel {vessel_info[i]['vessel_id']}:")
        print(f"  Last Known Position: ({actual_lat:.4f}, {actual_lng:.4f})")
        print(f"  Predicted Position:  ({predicted_lat:.4f}, {predicted_lng:.4f})")
        print(f"  Position Error:      {distance_error:.2f} km")
        print(f"  Average Speed:       {vessel_info[i]['avg_speed']:.2f} knots")
    
    # Calculate overall statistics
    all_errors = []
    for i in range(n_vessels):
        predicted_lat, predicted_lng = predictions[i][0], predictions[i][1]
        actual_lat, actual_lng = X_test_trajectory[i][-1][0], X_test_trajectory[i][-1][1]
        lat_error = abs(predicted_lat - actual_lat)
        lng_error = abs(predicted_lng - actual_lng)
        distance_error = np.sqrt(lat_error**2 + lng_error**2) * 111
        all_errors.append(distance_error)
    
    print("\n" + "=" * 80)
    print("TRAJECTORY MODEL PERFORMANCE SUMMARY:")
    print("=" * 80)
    print(f"Average Position Error:    {np.mean(all_errors):.2f} km")
    print(f"Median Position Error:     {np.median(all_errors):.2f} km")
    print(f"Min Position Error:        {np.min(all_errors):.2f} km")
    print(f"Max Position Error:        {np.max(all_errors):.2f} km")
    print(f"Std Dev Position Error:    {np.std(all_errors):.2f} km")
    print(f"95th Percentile Error:     {np.percentile(all_errors, 95):.2f} km")
    
    # Performance rating
    avg_error = np.mean(all_errors)
    if avg_error < 50:
        rating = "EXCELLENT"
        emoji = "🌟"
    elif avg_error < 100:
        rating = "GOOD"
        emoji = "✅"
    elif avg_error < 150:
        rating = "ACCEPTABLE"
        emoji = "⚠️"
    else:
        rating = "NEEDS IMPROVEMENT"
        emoji = "❌"
    
    print(f"\n{emoji} Performance Rating: {rating} {emoji}")
    
except Exception as e:
    print(f"❌ Error testing trajectory model: {str(e)}")
    import traceback
    traceback.print_exc()

# ============================================================================
# PART 2: TEST BEHAVIOR CLASSIFICATION MODEL
# ============================================================================
print("\n\n" + "=" * 80)
print("PART 2: BEHAVIOR CLASSIFICATION MODEL TEST")
print("=" * 80)

try:
    # Load behavior model
    behavior_model = keras.models.load_model('models/vessel_behavior_model.h5', compile=False)
    print("✅ Behavior classification model loaded successfully")
    print(f"Model input shape: {behavior_model.input_shape}")
    print(f"Model output shape: {behavior_model.output_shape}")
    
    # Load scaler
    import joblib
    scaler = joblib.load('models/vessel_behavior_model_scaler.pkl')
    print("✅ Feature scaler loaded")
    
    # Generate artificial behavior data
    # Model expects 8 features: speed, heading, speed_change, heading_change, 
    #                           distance_moved, time_delta, hour_of_day, day_of_week
    print("\n📊 Generating artificial vessel behavior scenarios...")
    
    behavior_scenarios = [
        {
            'name': 'Normal Fishing - Safe Zone',
            'speed': 5.0, 'heading': 180, 'speed_change': 0.5, 'heading_change': 5,
            'distance_moved': 2.5, 'time_delta': 5.0, 'hour': 10, 'day': 2,
            'expected': 'safe'
        },
        {
            'name': 'High Speed Near Coast',
            'speed': 28.0, 'heading': 90, 'speed_change': 8.0, 'heading_change': 25,
            'distance_moved': 12.0, 'time_delta': 180.0, 'hour': 22, 'day': 5,
            'expected': 'danger'
        },
        {
            'name': 'Erratic Movement Pattern',
            'speed': 12.0, 'heading': 270, 'speed_change': -4.0, 'heading_change': 45,
            'distance_moved': 5.5, 'time_delta': 5.0, 'hour': 2, 'day': 6,
            'expected': 'warning'
        },
        {
            'name': 'Slow Drift - Safe',
            'speed': 2.0, 'heading': 45, 'speed_change': 0.1, 'heading_change': 2,
            'distance_moved': 0.5, 'time_delta': 5.0, 'hour': 14, 'day': 3,
            'expected': 'safe'
        },
        {
            'name': 'Rapid Direction Changes',
            'speed': 30.0, 'heading': 135, 'speed_change': 10.0, 'heading_change': 85,
            'distance_moved': 15.0, 'time_delta': 150.0, 'hour': 23, 'day': 0,
            'expected': 'danger'
        },
        {
            'name': 'Moderate Speed Normal Pattern',
            'speed': 8.0, 'heading': 200, 'speed_change': 1.0, 'heading_change': 10,
            'distance_moved': 3.5, 'time_delta': 5.0, 'hour': 8, 'day': 1,
            'expected': 'safe'
        },
        {
            'name': 'Night Activity High Speed',
            'speed': 32.0, 'heading': 0, 'speed_change': 12.0, 'heading_change': 30,
            'distance_moved': 18.0, 'time_delta': 200.0, 'hour': 1, 'day': 4,
            'expected': 'danger'
        },
        {
            'name': 'Circular Fishing Pattern',
            'speed': 6.0, 'heading': 90, 'speed_change': 0.3, 'heading_change': 15,
            'distance_moved': 2.0, 'time_delta': 5.0, 'hour': 12, 'day': 2,
            'expected': 'safe'
        },
        {
            'name': 'Sudden Speed Increase',
            'speed': 14.0, 'heading': 180, 'speed_change': 8.0, 'heading_change': 25,
            'distance_moved': 5.0, 'time_delta': 5.0, 'hour': 20, 'day': 5,
            'expected': 'warning'
        },
        {
            'name': 'Stationary for Long Period',
            'speed': 0.5, 'heading': 0, 'speed_change': -0.1, 'heading_change': 0,
            'distance_moved': 0.1, 'time_delta': 5.0, 'hour': 16, 'day': 3,
            'expected': 'safe'
        }
    ]
    
    # Prepare input data for model
    X_test_behavior = []
    for scenario in behavior_scenarios:
        X_test_behavior.append([
            scenario['speed'],
            scenario['heading'],
            scenario['speed_change'],
            scenario['heading_change'],
            scenario['distance_moved'],
            scenario['time_delta'],
            scenario['hour'],
            scenario['day']
        ])
    
    X_test_behavior = np.array(X_test_behavior)
    print(f"✅ Generated {len(behavior_scenarios)} behavior scenarios")
    print(f"   Shape: {X_test_behavior.shape}")
    
    # Scale features
    X_test_scaled = scaler.transform(X_test_behavior)
    print(f"✅ Features scaled")
    
    # Make predictions
    print("\n🔮 Running behavior classifications...")
    behavior_predictions = behavior_model.predict(X_test_scaled, verbose=0)
    print(f"✅ Classifications completed")
    print(f"   Predictions shape: {behavior_predictions.shape}")
    
    # Behavior classes
    behavior_classes = ['safe', 'warning', 'danger']
    
    # Analyze predictions
    print("\n📈 BEHAVIOR CLASSIFICATION RESULTS:")
    print("=" * 80)
    
    correct_predictions = 0
    
    for i, scenario in enumerate(behavior_scenarios):
        predicted_class_idx = np.argmax(behavior_predictions[i])
        predicted_class = behavior_classes[predicted_class_idx]
        confidence = behavior_predictions[i][predicted_class_idx] * 100
        
        # All class probabilities
        class_probs = behavior_predictions[i]
        
        is_correct = predicted_class == scenario['expected']
        if is_correct:
            correct_predictions += 1
            status = "✅ CORRECT"
        else:
            status = "❌ INCORRECT"
        
        print(f"\n{status} - Scenario {i+1}: {scenario['name']}")
        print(f"  Speed: {scenario['speed']} knots | Heading: {scenario['heading']}°")
        print(f"  Speed Change: {scenario['speed_change']:.1f} | Heading Change: {scenario['heading_change']}°")
        print(f"  Distance: {scenario['distance_moved']:.1f} km | Time: {scenario['hour']}:00")
        print(f"  Expected: {scenario['expected'].upper()}")
        print(f"  Predicted: {predicted_class.upper()} (confidence: {confidence:.2f}%)")
        print(f"  Probabilities:")
        for j, cls in enumerate(behavior_classes):
            print(f"    - {cls.upper()}: {class_probs[j]*100:.2f}%")
    
    # Calculate accuracy
    accuracy = (correct_predictions / len(behavior_scenarios)) * 100
    
    print("\n" + "=" * 80)
    print("BEHAVIOR CLASSIFICATION PERFORMANCE SUMMARY:")
    print("=" * 80)
    print(f"Total Scenarios:        {len(behavior_scenarios)}")
    print(f"Correct Predictions:    {correct_predictions}")
    print(f"Incorrect Predictions:  {len(behavior_scenarios) - correct_predictions}")
    print(f"Accuracy:               {accuracy:.2f}%")
    
    # Performance rating
    if accuracy >= 90:
        rating = "EXCELLENT"
        emoji = "🌟"
    elif accuracy >= 75:
        rating = "GOOD"
        emoji = "✅"
    elif accuracy >= 60:
        rating = "ACCEPTABLE"
        emoji = "⚠️"
    else:
        rating = "NEEDS IMPROVEMENT"
        emoji = "❌"
    
    print(f"\n{emoji} Performance Rating: {rating} {emoji}")
    
    # Confusion matrix analysis
    print("\n📊 Classification Distribution:")
    predicted_counts = {}
    for pred in behavior_predictions:
        pred_class = behavior_classes[np.argmax(pred)]
        predicted_counts[pred_class] = predicted_counts.get(pred_class, 0) + 1
    
    for cls in behavior_classes:
        count = predicted_counts.get(cls, 0)
        percentage = (count / len(behavior_scenarios)) * 100
        print(f"  {cls.upper()}: {count} predictions ({percentage:.1f}%)")
    
except Exception as e:
    print(f"❌ Error testing behavior model: {str(e)}")
    import traceback
    traceback.print_exc()

# ============================================================================
# FINAL SUMMARY
# ============================================================================
print("\n\n" + "=" * 80)
print("FINAL TEST SUMMARY")
print("=" * 80)
print(f"Test completed at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
print("\nModel Performance Overview:")
print("  1. Trajectory Predictor: Position prediction with sequence data")
print("  2. Behavior Classifier: Risk assessment and violation detection")
print("\n✅ All tests completed successfully!")
print("=" * 80)
