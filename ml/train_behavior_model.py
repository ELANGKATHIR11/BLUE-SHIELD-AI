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
Train Vessel Behavior Prediction Model
Creates neural network for classifying vessel behavior: safe, warning, danger
"""

import tensorflow as tf
from tensorflow import keras
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
import joblib
import numpy as np
import os
import json
from datetime import datetime
import logging
from data_collector import VesselDataCollector

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VesselBehaviorModel:
    def __init__(self):
        """Initialize behavior prediction model"""
        self.model = None
        self.scaler = StandardScaler()
        logger.info("VesselBehaviorModel initialized")
        
    def create_model(self, input_dim):
        """Create neural network for behavior classification"""
        model = keras.Sequential([
            keras.layers.Dense(128, activation='relu', input_dim=input_dim),
            keras.layers.Dropout(0.3),
            keras.layers.Dense(64, activation='relu'),
            keras.layers.Dropout(0.2),
            keras.layers.Dense(32, activation='relu'),
            keras.layers.Dense(3, activation='softmax')  # 3 classes: safe, warning, danger
        ])
        
        model.compile(
            optimizer='adam',
            loss='sparse_categorical_crossentropy',
            metrics=['accuracy']
        )
        
        logger.info("✅ Model architecture created")
        logger.info(f"   Input dimension: {input_dim}")
        logger.info(f"   Total parameters: {model.count_params():,}")
        
        return model
    
    def train(self, X, y, epochs=50, batch_size=32, validation_split=0.2):
        """Train the model with class balancing"""
        logger.info(f"\n🚀 Starting model training...")
        logger.info(f"   Training samples: {len(X)}")
        logger.info(f"   Epochs: {epochs}")
        logger.info(f"   Batch size: {batch_size}")
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        logger.info(f"   Train set: {len(X_train)} samples")
        logger.info(f"   Test set: {len(X_test)} samples")
        
        # Calculate class weights for balanced training
        from sklearn.utils.class_weight import compute_class_weight
        class_weights = compute_class_weight(
            class_weight='balanced',
            classes=np.unique(y_train),
            y=y_train
        )
        class_weight_dict = {i: weight for i, weight in enumerate(class_weights)}
        
        logger.info(f"\n⚖️  Class weights (for balanced training):")
        for class_idx, weight in class_weight_dict.items():
            class_name = ['Safe', 'Warning', 'Danger'][class_idx]
            logger.info(f"      {class_name}: {weight:.3f}")
        
        # Scale features
        X_train_scaled = self.scaler.fit_transform(X_train)
        X_test_scaled = self.scaler.transform(X_test)
        
        # Create model
        self.model = self.create_model(X_train_scaled.shape[1])
        
        # Callbacks
        early_stop = keras.callbacks.EarlyStopping(
            monitor='val_loss',
            patience=10,
            restore_best_weights=True,
            verbose=1
        )
        
        reduce_lr = keras.callbacks.ReduceLROnPlateau(
            monitor='val_loss',
            factor=0.5,
            patience=5,
            min_lr=0.00001,
            verbose=1
        )
        
        # Train with class weights for balanced learning
        logger.info("\n📊 Training progress (with class balancing):")
        history = self.model.fit(
            X_train_scaled, y_train,
            epochs=epochs,
            batch_size=batch_size,
            validation_split=validation_split,
            callbacks=[early_stop, reduce_lr],
            class_weight=class_weight_dict,  # Apply class balancing
            verbose=1
        )
        
        # Evaluate
        logger.info("\n📈 Evaluating model on test set...")
        test_results = self.model.evaluate(X_test_scaled, y_test, verbose=0)
        
        # Detailed per-class evaluation
        y_pred = np.argmax(self.model.predict(X_test_scaled, verbose=0), axis=1)
        
        logger.info(f"\n✅ Test Results:")
        logger.info(f"   Test Loss: {test_results[0]:.4f}")
        logger.info(f"   Test Accuracy: {test_results[1]:.4f}")
        
        logger.info(f"\n📊 Per-Class Performance:")
        for class_idx in [0, 1, 2]:
            class_name = ['Safe', 'Warning', 'Danger'][class_idx]
            class_mask = y_test == class_idx
            class_accuracy = (y_pred[class_mask] == y_test[class_mask]).mean()
            class_count = class_mask.sum()
            logger.info(f"      {class_name}: {class_accuracy:.2%} accuracy ({class_count} samples)")
        
        return history, test_results
    
    def save_model(self, model_path='models/vessel_behavior_model.h5'):
        """Save model and scaler"""
        # Create models directory if it doesn't exist
        os.makedirs(os.path.dirname(model_path), exist_ok=True)
        
        # Save model
        self.model.save(model_path)
        
        # Save scaler
        scaler_path = model_path.replace('.h5', '_scaler.pkl')
        joblib.dump(self.scaler, scaler_path)
        
        # Save metadata
        metadata = {
            'model_path': model_path,
            'scaler_path': scaler_path,
            'created_at': datetime.now().isoformat(),
            'input_features': [
                'speed', 'heading', 'speed_change', 'heading_change',
                'distance_moved', 'time_delta', 'hour_of_day', 'day_of_week'
            ],
            'output_classes': {
                '0': 'safe',
                '1': 'warning',
                '2': 'danger'
            },
            'model_version': '1.0.0'
        }
        
        metadata_path = model_path.replace('.h5', '_metadata.json')
        with open(metadata_path, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        logger.info(f"\n✅ Model saved successfully:")
        logger.info(f"   Model: {model_path}")
        logger.info(f"   Scaler: {scaler_path}")
        logger.info(f"   Metadata: {metadata_path}")
    
    def load_model(self, model_path='models/vessel_behavior_model.h5'):
        """Load trained model"""
        self.model = keras.models.load_model(model_path)
        
        scaler_path = model_path.replace('.h5', '_scaler.pkl')
        self.scaler = joblib.load(scaler_path)
        
        logger.info(f"✅ Model loaded from {model_path}")


def main():
    """Main training function"""
    logger.info("\n" + "="*60)
    logger.info("🚢 VESSEL BEHAVIOR MODEL TRAINING")
    logger.info("="*60)
    
    # Collect training data with increased samples and danger scenarios
    collector = VesselDataCollector()
    df = collector.generate_synthetic_training_data(num_samples=5000)
    
    # Prepare features and labels
    feature_cols = [
        'speed', 'heading', 'speed_change', 'heading_change', 
        'distance_moved', 'time_delta', 'hour_of_day', 'day_of_week'
    ]
    X = df[feature_cols].values
    y = df['risk_label'].values
    
    logger.info(f"\n📊 Dataset Summary:")
    logger.info(f"   Total samples: {len(df)}")
    logger.info(f"   Features: {len(feature_cols)}")
    logger.info(f"   Class distribution:")
    for label, count in zip(*np.unique(y, return_counts=True)):
        class_name = ['Safe', 'Warning', 'Danger'][label]
        percentage = (count / len(y)) * 100
        logger.info(f"      {class_name}: {count} ({percentage:.1f}%)")
    
    # Train model
    model = VesselBehaviorModel()
    history, test_results = model.train(X, y, epochs=50, batch_size=32)
    
    # Save model
    model.save_model('models/vessel_behavior_model.h5')
    
    logger.info("\n" + "="*60)
    logger.info("✅ TRAINING COMPLETE!")
    logger.info("="*60)
    logger.info("\n💡 Next steps:")
    logger.info("   1. Update backend/app.py to use the trained model")
    logger.info("   2. Test predictions with real vessel data")
    logger.info("   3. Monitor model performance in production")
    logger.info("\n")


if __name__ == '__main__':
    main()
