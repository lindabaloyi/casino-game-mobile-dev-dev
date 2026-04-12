/**
 * Environment-based Smart Server URL Resolver
 * Automatically detects the best server URL based on network context
 * 
 * Platform Detection:
 * - Android Emulator (with adb reverse): http://localhost:3001
 * - Android Emulator (without adb reverse): http://10.0.2.2:3001
 * - Physical Android Device: http://<LAN_IP>:3001
 * - Web/Expo Go: http://localhost:3001
 */

import { Platform } from 'react-native';
import { isDevice } from 'expo-device';

// Types for different network contexts
export type NetworkMode = 'local' | 'lan' | 'production' | 'fallback';

export interface ServerConfig {
  localUrl: string;
  lanUrl: string;
  productionUrl?: string;
  enableAutoDetect: boolean;
  fallbackUrl?: string;
}

export interface UriTestResult {
  url: string;
  accessible: boolean;
  responseTime: number;
  error?: string;
}

/**
 * Check if running on Android emulator
 */
function isAndroidEmulator(): boolean {
  if (Platform.OS !== 'android') return false;
  // isDevice is false when running on emulator
  return !isDevice;
}

/**
 * Check if running on physical Android device
 */
function isPhysicalAndroidDevice(): boolean {
  if (Platform.OS !== 'android') return false;
  return isDevice;
}

/**
 * Smart Server URL Resolver
 * Automatically detects the best server URL based on network context
 */
export class ServerUrlResolver {
  private config: ServerConfig;

  constructor(config?: Partial<ServerConfig>) {
    // Get LAN IP from environment or use default
    const lanIp = process.env.EXPO_PUBLIC_LAN_IP || process.env.LAN_IP || '';
    
    this.config = {
      // localhost works for: Web, Expo Go, Android Emulator with adb reverse
      localUrl: process.env.EXPO_PUBLIC_SOCKET_URL_LOCAL || process.env.SOCKET_URL_LOCAL || 'http://localhost:3001',
      // Android emulator uses 10.0.2.2 to connect to host localhost
      // Physical devices on same network use the LAN IP
      lanUrl: process.env.EXPO_PUBLIC_SOCKET_URL_LAN || process.env.SOCKET_URL_LAN || (lanIp ? `http://${lanIp}:3001` : 'http://10.0.2.2:3001'),
      productionUrl: process.env.EXPO_PUBLIC_SOCKET_URL_PRODUCTION || process.env.SOCKET_URL_PRODUCTION,
      enableAutoDetect: process.env.EXPO_PUBLIC_AUTODETECT_ENABLED === 'true' || process.env.AUTODETECT_ENABLED === 'true' ? true : true,
      // Default fallback depends on platform
      fallbackUrl: isAndroidEmulator() ? 'http://10.0.2.2:3001' : 'http://localhost:3001',
      ...config
    };
  }

  /**
   * Get the optimal server URL based on current context
   * Priority: Platform Detection > Manual Override > Auto-detection > Fallback
   */
  async getOptimalUrl(): Promise<string> {
    // Priority 1: Platform-specific URLs (no network test needed)
    if (isAndroidEmulator()) {
      // Android emulator - prefer localhost if using adb reverse
      return this.config.localUrl; // http://localhost:3001
    }
    
    if (isPhysicalAndroidDevice()) {
      // Physical Android device - must use LAN IP
      const lanUrl = this.config.lanUrl;
      return lanUrl;
    }
    
    // Priority 2: Manual override in environment
    const manualUrl = this.getManualOverrideUrl();
    if (manualUrl) {
      return manualUrl;
    }

    if (!this.config.enableAutoDetect) {
      return this.config.localUrl;
    }

    // Priority 3: Auto-detection (web only)
    return this.detectBestUrl();
  }

  /**
   * Check if there's a manual URL override in environment/config
   */
  private getManualOverrideUrl(): string | null {
    // Check for explicit environment variables
    const envUrl = process.env.REACT_APP_SOCKET_URL ||
                   process.env.SOCKET_URL ||
                   process.env.EXPO_PUBLIC_SOCKET_URL;

    if (envUrl && envUrl !== 'null' && envUrl !== 'undefined') {
      return envUrl;
    }

    return null;
  }

  /**
   * Auto-detection algorithm: tests connectivity to find best URL
   */
  private async detectBestUrl(): Promise<string> {
    const candidates = [
      { url: this.config.localUrl, priority: 1, label: 'LOCAL' },
      { url: this.config.lanUrl, priority: 2, label: 'LAN' },
      { url: this.config.productionUrl, priority: 3, label: 'PRODUCTION' }
    ].filter(c => c.url); // Remove undefined URLs

    // Test all candidate URLs in parallel
    const tests = candidates.map(async (candidate) => {
      if (!candidate.url) return null;
      const result = await this.testUrlConnectivity(candidate.url);
      return {
        ...candidate,
        ...result
      };
    });

    const results = await Promise.all(tests);
    const validResults = results.filter(r => r !== null);

    // Find the best accessible URL (highest priority among accessible ones)
    const accessibleResults = validResults.filter((r: any) => r.accessible);
    if (accessibleResults.length > 0) {
      const best = accessibleResults.sort((a: any, b: any) => a.priority - b.priority)[0];
      return best.url;
    }

    // Fallback to configured default
    return this.config.fallbackUrl!;
  }

  /**
   * Test connectivity to a specific URL using Socket.IO handshake
   */
  private async testUrlConnectivity(url: string): Promise<UriTestResult> {
    const startTime = Date.now();

    try {
      // Use fetch to test basic connectivity first
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      const response = await fetch(`${url}/socket.io/?EIO=4&transport=polling&t=test`, {
        method: 'GET',
        headers: {
          'Accept': '*/*',
          'Cache-Control': 'no-cache'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      const accessible = response.ok ||
        (response.status >= 400 && response.status < 500); // 4xx means server responded

      return {
        url,
        accessible,
        responseTime,
        error: accessible ? undefined : `HTTP ${response.status}`
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;

      // If it's a timeout, it might still be accessible but slow
      const isTimeout = error.name === 'AbortError';
      const isNetworkError = error.message?.includes('Network request failed');

      return {
        url,
        accessible: isTimeout || isNetworkError ? false : true, // Conservative: only mark accessible if we got a real response
        responseTime,
        error: error.message || 'Connection failed'
      };
    }
  }

  /**
   * Get diagnostic information about URL detection process
   */
  async getDiagnostics(): Promise<any> {
    const candidates = [
      { url: this.config.localUrl, label: 'LOCAL' },
      { url: this.config.lanUrl, label: 'LAN' },
      { url: this.config.productionUrl, label: 'PRODUCTION' }
    ].filter(c => c.url);

    const results = await Promise.all(
      candidates.map(async (candidate) => ({
        ...candidate,
        ...(await this.testUrlConnectivity(candidate.url!))
      }))
    );

    return {
      config: this.config,
      candidates: results,
      recommendation: await this.getOptimalUrl(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Update configuration dynamically
   */
  updateConfig(newConfig: Partial<ServerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Global instance for singleton pattern
let globalResolver: ServerUrlResolver | null = null;

/**
 * Get or create the global server URL resolver instance
 */
export function getServerUrlResolver(config?: Partial<ServerConfig>): ServerUrlResolver {
  if (!globalResolver) {
    globalResolver = new ServerUrlResolver(config);
  }
  return globalResolver;
}

/**
 * Convenience function: Get optimal server URL
 */
export async function getOptimalServerUrl(): Promise<string> {
  return getServerUrlResolver().getOptimalUrl();
}

/**
 * Convenience function: Get diagnostic info
 */
export async function getServerUrlDiagnostics() {
  return getServerUrlResolver().getDiagnostics();
}

// Default export for convenience
export default ServerUrlResolver;
