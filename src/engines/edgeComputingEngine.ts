/**
 * ============================================================================
 * PROPRIETARY AND CONFIDENTIAL — BLUE-SHIELD-AI™
 * COPYRIGHT (C) 2026. ALL RIGHTS RESERVED.
 *
 * OWNER & INVENTOR: Elangkathir (GitHub: https://github.com/ELANGKATHIR11)
 * 
 * NOTICE & RESTRICTIONS:
 * 1. COMMERCIAL USE, DUPLICATION, OR RE-DISTRIBUTION IS STRICTLY PROHIBITED.
 * 2. ONLY THE AUTHORIZED OWNER HOLDS ALL INTELLECTUAL PROPERTY & USAGE RIGHTS.
 * 3. NO AI CODING ASSISTANT, AUTOMATED AGENT, OR THIRD-PARTY MODEL IS PERMITTED
 *    TO COPY, MODIFY, SCRAPE, OR ALTER THIS CODEBASE WITHOUT EXPLICIT PERMISSION.
 * ============================================================================
 */
/**
 * EDGE COMPUTING & FEDERATED LEARNING ENGINE
 * Distributed ML inference across edge devices
 * Privacy-preserving learning while maintaining compliance
 */

import type { BoatData } from '../App';

export interface EdgeDeviceMetrics {
  deviceId: string;
  cpuUsage: number;
  memoryUsage: number;
  batteryLevel: number;
  networkQuality: number;
  isOnline: boolean;
}

export interface FederatedUpdate {
  deviceId: string;
  modelVersion: number;
  weights: number[];
  gradients: number[];
  loss: number;
  timestamp: number;
}

/**
 * Edge Device Manager
 */
class EdgeComputingEngine {
  private devices = new Map<string, EdgeDeviceMetrics>();
  private federatedUpdates: FederatedUpdate[] = [];
  private modelVersion = 1;
  private aggregatedWeights: number[] = [];

  /**
   * Register edge device (LoRA repeater, radar station, etc.)
   */
  registerDevice(deviceId: string): void {
    this.devices.set(deviceId, {
      deviceId,
      cpuUsage: 0,
      memoryUsage: 0,
      batteryLevel: 100,
      networkQuality: 1,
      isOnline: true
    });
  }

  /**
   * Update device health metrics
   */
  updateDeviceMetrics(
    deviceId: string,
    metrics: Partial<EdgeDeviceMetrics>
  ): void {
    const device = this.devices.get(deviceId);
    if (device) {
      Object.assign(device, metrics);
    }
  }

  /**
   * Get devices available for federated learning
   */
  getAvailableDevices(): EdgeDeviceMetrics[] {
    return Array.from(this.devices.values()).filter(
      d => d.isOnline && d.cpuUsage < 80 && d.memoryUsage < 90
    );
  }

  /**
   * Submit federated learning update from edge device
   */
  submitFederatedUpdate(update: FederatedUpdate): void {
    this.federatedUpdates.push(update);

    // Trigger aggregation if threshold reached
    if (this.federatedUpdates.length >= 3) {
      this.aggregateUpdates();
    }
  }

  /**
   * Aggregate federated updates using FedAvg
   */
  private aggregateUpdates(): void {
    if (this.federatedUpdates.length === 0) return;

    const updates = this.federatedUpdates;
    const numUpdates = updates.length;
    const weightSize = updates[0].weights.length;

    // Initialize aggregated weights
    if (this.aggregatedWeights.length === 0) {
      this.aggregatedWeights = new Array(weightSize).fill(0);
    }

    // Average weights
    for (let i = 0; i < weightSize; i++) {
      this.aggregatedWeights[i] = 0;
      for (const update of updates) {
        this.aggregatedWeights[i] += update.weights[i];
      }
      this.aggregatedWeights[i] /= numUpdates;
    }

    this.modelVersion++;
    this.federatedUpdates = [];

    console.log(
      `✅ Aggregated ${numUpdates} federated updates. Model v${this.modelVersion}`
    );
  }

  /**
   * Get latest model for edge deployment
   */
  getModelForDeployment(): {
    version: number;
    weights: number[];
  } {
    return {
      version: this.modelVersion,
      weights: [...this.aggregatedWeights]
    };
  }

  /**
   * Evaluate model performance across devices
   */
  getDistributedMetrics(): {
    averageLoss: number;
    deviceCount: number;
    convergenceRate: number;
  } {
    if (this.federatedUpdates.length === 0) {
      return { averageLoss: 0, deviceCount: 0, convergenceRate: 0 };
    }

    const losses = this.federatedUpdates.map(u => u.loss);
    const averageLoss = losses.reduce((a, b) => a + b, 0) / losses.length;

    // Simple convergence check
    const recentLosses = losses.slice(-5);
    const convergenceRate =
      recentLosses.length > 1
        ? (recentLosses[0] - recentLosses[recentLosses.length - 1]) /
          recentLosses[0]
        : 0;

    return {
      averageLoss,
      deviceCount: this.federatedUpdates.length,
      convergenceRate: Math.abs(convergenceRate)
    };
  }

  /**
   * Process vessel data at edge (no cloud dependency)
   */
  processAtEdge(
    vesselData: BoatData[],
    deviceId: string
  ): { anomalies: string[]; processedCount: number } {
    const device = this.devices.get(deviceId);
    if (!device) return { anomalies: [], processedCount: 0 };

    // Simulate edge processing overhead
    device.cpuUsage = Math.min(95, device.cpuUsage + 30);

    const anomalies: string[] = [];

    for (const vessel of vesselData) {
      // Simple edge-based anomaly detection
      if (vessel.speed > 20 || vessel.status === 'warning' || vessel.status === 'danger') {
        anomalies.push(vessel.aisId);
      }
    }

    return { anomalies, processedCount: vesselData.length };
  }

  /**
   * Estimate latency for edge-to-cloud communication
   */
  estimateLatency(deviceId: string): number {
    const device = this.devices.get(deviceId);
    if (!device) return 1000;

    // Network quality affects latency (1-100 = 50-500ms)
    const baseLatency = 50 + (100 - device.networkQuality) * 4.5;

    // Battery affects network transmission
    const batteryImpact =
      device.batteryLevel < 20 ? baseLatency * 1.5 : baseLatency;

    return batteryImpact;
  }

  /**
   * Get edge computing status
   */
  getStatus(): {
    totalDevices: number;
    activeDevices: number;
    modelVersion: number;
    averageCpu: number;
    averageBattery: number;
  } {
    const devices = Array.from(this.devices.values());
    const activeCount = devices.filter(d => d.isOnline).length;
    const avgCpu =
      devices.reduce((sum, d) => sum + d.cpuUsage, 0) / devices.length || 0;
    const avgBattery =
      devices.reduce((sum, d) => sum + d.batteryLevel, 0) / devices.length ||
      100;

    return {
      totalDevices: devices.length,
      activeDevices: activeCount,
      modelVersion: this.modelVersion,
      averageCpu: Math.round(avgCpu),
      averageBattery: Math.round(avgBattery)
    };
  }
}

export const edgeComputingEngine = new EdgeComputingEngine();
