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
BLUE SHIELD AI — ML Model Training Pipeline
Trains Random Forest & Gradient Boosting classifiers using Global Fishing Watch datasets.
Exports models to serialized .joblib files for MarOS backend inference.
"""

import os
import sys
import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score

# Paths
BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
DATASET_CSV = os.path.join(BASE_DIR, "BLUE-SHIELD-AI-vessel-tracking--main/datasets/files (3)/blueshield-ml-training-datasets/gfw_labels/ALL_labeled_fishing_intervals.csv")
MODELS_DIR = os.path.join(BASE_DIR, "project/ml/models")

os.makedirs(MODELS_DIR, exist_ok=True)

def train_maritime_models():
    print("==========================================================")
    print("[BLUE SHIELD AI] ML Training Engine Started")
    print("==========================================================")
    
    if not os.path.exists(DATASET_CSV):
        print(f"[ERROR] Dataset file not found at: {DATASET_CSV}")
        return

    print(f"[INFO] Loading dataset: {os.path.basename(DATASET_CSV)}...")
    df = pd.read_csv(DATASET_CSV)
    print(f"[OK] Loaded {len(df):,} labeled fishing interval records.")

    # Data processing & binary target discretization (>= 0.5 = fishing)
    df['is_fishing_binary'] = (df['is_fishing'] >= 0.5).astype(int)

    df['start_time'] = pd.to_datetime(df['start_time'])
    df['end_time'] = pd.to_datetime(df['end_time'])
    df['duration_seconds'] = (df['end_time'] - df['start_time']).dt.total_seconds()
    df['start_hour'] = df['start_time'].dt.hour
    df['is_night_operation'] = df['start_hour'].apply(lambda h: 1 if h >= 22 or h <= 4 else 0)

    features = ['duration_seconds', 'start_hour', 'is_night_operation']
    target = 'is_fishing_binary'

    X = df[features]
    y = df[target]

    print(f"\n[INFO] Dataset Binary Class Balance:\n{y.value_counts(normalize=True)}")

    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

    # 1. Train Random Forest Classifier
    print("\n[TRAIN] Training Random Forest Classifier (Model C: Fishing Activity Detection)...")
    rf_model = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
    rf_model.fit(X_train, y_train)
    rf_preds = rf_model.predict(X_test)
    rf_acc = accuracy_score(y_test, rf_preds)
    rf_auc = roc_auc_score(y_test, rf_model.predict_proba(X_test)[:, 1])
    print(f"[METRICS] Random Forest Accuracy: {rf_acc * 100:.2f}% | ROC-AUC: {rf_auc:.4f}")

    # 2. Train Gradient Boosting Classifier (Border Anomaly Detection)
    print("\n[TRAIN] Training Gradient Boosting Classifier (Model B: Anomaly Classifier)...")
    gb_model = GradientBoostingClassifier(n_estimators=100, learning_rate=0.1, max_depth=6, random_state=42)
    gb_model.fit(X_train, y_train)
    gb_preds = gb_model.predict(X_test)
    gb_acc = accuracy_score(y_test, gb_preds)
    print(f"[METRICS] Gradient Boosting Accuracy: {gb_acc * 100:.2f}%")

    # Save trained models
    rf_path = os.path.join(MODELS_DIR, "fishing_activity_rf.joblib")
    gb_path = os.path.join(MODELS_DIR, "vessel_anomaly_gb.joblib")

    joblib.dump(rf_model, rf_path)
    joblib.dump(gb_model, gb_path)

    print("\n[SAVE] Saved Trained ML Models:")
    print(f"   - {rf_path}")
    print(f"   - {gb_path}")
    print("\n[SUCCESS] Training Pipeline Completed Successfully!")

if __name__ == "__main__":
    train_maritime_models()
