import { describe, it, expect } from 'vitest';
import { DeviceMonitor } from '../src/services/deviceMonitor';

describe('DeviceMonitor', () => {
  it('detects device capabilities with fallbacks', async () => {
    const caps = await DeviceMonitor.getDeviceCapabilities();
    expect(caps.hardwareConcurrency).toBeGreaterThanOrEqual(1);
    expect(typeof caps.isWasmSupported).toBe('boolean');
    expect(caps.recommendedDepth).toBeGreaterThanOrEqual(10);
    expect(['fast', 'balanced', 'deep']).toContain(caps.recommendedPreset);
  });

  it('estimates workload accurately with default baseline', () => {
    // 5 games, 60 plies each = 300 plies
    const estimate = DeviceMonitor.estimateWorkload(5, 60, 12);
    expect(estimate.totalPlies).toBe(300);
    expect(estimate.nodesPerPlyEstimate).toBe(45000);
    expect(estimate.confidence).toBe('Approximate baseline estimate');
    expect(estimate.comfortLevel).toBe('Light');
    expect(estimate.memoryNote).toContain('Browser JavaScript cannot read live operating system RAM');
  });

  it('uses measured benchmark NPS when available for calibration', () => {
    const measuredNps = 900000;
    const estimate = DeviceMonitor.estimateWorkload(10, 60, 14, measuredNps);
    expect(estimate.confidence).toBe('Calibrated from benchmark');
    expect(estimate.comfortLevel).toBe('Moderate');
    // 600 plies * 160000 nodes = 96,000,000 nodes / 900,000 nps ~ 107 seconds
    expect(estimate.estimatedSeconds).toBe(107);
  });

  it('flags heavy workloads appropriately', () => {
    const heavyEstimate = DeviceMonitor.estimateWorkload(50, 70, 16);
    expect(heavyEstimate.comfortLevel).toBe('Heavy');
    expect(heavyEstimate.comfortDescription).toContain('Substantial workload');
  });
});
