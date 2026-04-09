/**
 * BLUE SHIELD AI - Engine Exports
 * Central export point for all 12 AI engines + Telemetry
 */

// Phase 1: Core Anomaly Detection
export * from './anomalyDetector';
export * from './clusterEngine';
export * from './kalmanFilter';

// Phase 2: Real-time Processing
export * from './loraSimulator';
export * from './geofence';
export * from './storeAndForwardBuffer';

// Phase 3: Advanced Analytics
export * from './tensorflowAnomalyEngine';
export { findNearestVessels, findVesselsInRadius, identifyVesselClusters, updateVectorStore } from './wasmVectorSearchEngine';
export { recommendationEngine } from './recommendationEngine';

// Phase 4: Security & Integrity
export { blockchainEngine } from './blockchainIntegrityEngine';
export { edgeComputingEngine } from './edgeComputingEngine';
export { adversarialRobustnessEngine } from './adversarialRobustnessEngine';

// Telemetry & Monitoring
export { telemetryEngine } from './telemetryEngine';
export type { EngineMetrics, TelemetrySnapshot } from './telemetryEngine';

// Legacy support
export * from './riskModel';
export * from './geminiLayer';
