import { DeviceCapabilities, EnginePreset } from '../types/chess';
import { storageService } from '../storage/indexedDb';

export class DeviceMonitor {
  /**
   * Retrieves honest, verified browser device capabilities.
   */
  static async getDeviceCapabilities(): Promise<DeviceCapabilities> {
    const hardwareConcurrency =
      typeof navigator !== 'undefined' && navigator.hardwareConcurrency
        ? navigator.hardwareConcurrency
        : 4;

    const deviceMemoryGb =
      typeof navigator !== 'undefined' && (navigator as any).deviceMemory
        ? (navigator as any).deviceMemory
        : undefined;

    const isWasmSupported =
      typeof WebAssembly === 'object' && typeof WebAssembly.validate === 'function';

    let storageUsageBytes: number | undefined;
    let storageQuotaBytes: number | undefined;

    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      try {
        const estimate = await navigator.storage.estimate();
        storageUsageBytes = estimate.usage;
        storageQuotaBytes = estimate.quota;
      } catch {
        // Storage estimate failed or denied
      }
    }

    let measuredNps: number | undefined;
    if (typeof indexedDB !== 'undefined') {
      try {
        const latestBenchmark = await storageService.getLatestBenchmark();
        measuredNps = latestBenchmark ? latestBenchmark.measuredNps : undefined;
      } catch {
        // Storage access unavailable
      }
    }

    // Determine conservative auto configuration
    let recommendedPreset: EnginePreset = 'balanced';
    let recommendedDepth = 12;

    if (hardwareConcurrency <= 2 || (deviceMemoryGb && deviceMemoryGb <= 2)) {
      recommendedPreset = 'fast';
      recommendedDepth = 10;
    } else if (hardwareConcurrency >= 8 && (!deviceMemoryGb || deviceMemoryGb >= 8)) {
      recommendedPreset = 'balanced';
      recommendedDepth = 12;
    }

    return {
      hardwareConcurrency,
      deviceMemoryGb,
      isWasmSupported,
      storageUsageBytes,
      storageQuotaBytes,
      measuredNps,
      recommendedPreset,
      recommendedDepth,
    };
  }

  /**
   * Generates honest workload duration and resource estimation.
   */
  static estimateWorkload(
    gameCount: number,
    avgPliesPerGame: number,
    depth: number,
    measuredNps?: number
  ): {
    totalPlies: number;
    estimatedSeconds: number;
    comfortLevel: 'Light' | 'Moderate' | 'Heavy';
    comfortDescription: string;
    memoryNote: string;
    confidence: 'Calibrated from benchmark' | 'Approximate baseline estimate';
    nodesPerPlyEstimate: number;
  } {
    const totalPlies = Math.max(1, gameCount * Math.max(10, Math.round(avgPliesPerGame || 60)));

    // Approximate average search tree nodes by depth for chess positions
    const nodesByDepth: Record<number, number> = {
      8: 3000,
      9: 6000,
      10: 12000,
      11: 22000,
      12: 45000,
      13: 85000,
      14: 160000,
      15: 320000,
      16: 650000,
      17: 1300000,
      18: 2500000,
    };

    const nodesPerPly = nodesByDepth[depth] || Math.round(45000 * Math.pow(1.9, depth - 12));
    const effectiveNps = measuredNps && measuredNps > 10000 ? measuredNps : 280000;

    const estimatedTotalNodes = totalPlies * nodesPerPly;
    const estimatedSeconds = Math.max(2, Math.round(estimatedTotalNodes / effectiveNps));

    let comfortLevel: 'Light' | 'Moderate' | 'Heavy' = 'Light';
    let comfortDescription = 'Easily handled in the background without noticeable system impact.';

    if (estimatedSeconds > 300 || gameCount > 30 || depth >= 15) {
      comfortLevel = 'Heavy';
      comfortDescription = 'Substantial workload. Consider a lower depth or batching if on battery power.';
    } else if (estimatedSeconds > 90 || depth >= 13) {
      comfortLevel = 'Moderate';
      comfortDescription = 'Balanced search suitable for standard desktop and laptop browsers.';
    }

    const memoryNote =
      'Stockfish WASM runs single-threaded in a Web Worker with an Emscripten heap capped at 32 MB and hash tables configured to 32 MB. Browser JavaScript cannot read live operating system RAM usage directly.';

    const confidence: 'Calibrated from benchmark' | 'Approximate baseline estimate' =
      measuredNps && measuredNps > 10000
        ? 'Calibrated from benchmark'
        : 'Approximate baseline estimate';

    return {
      totalPlies,
      estimatedSeconds,
      comfortLevel,
      comfortDescription,
      memoryNote,
      confidence,
      nodesPerPlyEstimate: nodesPerPly,
    };
  }
}
