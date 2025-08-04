/**
 * CRAG Sidecar Client
 * Handles communication with the CRAG sidecar service
 * Implements graceful failure and fallback patterns
 */

interface SidecarConfig {
  baseUrl: string;
  timeoutMs: number;
  retries: number;
  enabled: boolean;
}

interface SidecarResponse {
  success: boolean;
  fromCache: boolean;
  processingTimeMs: number;
  results?: any[];
  response?: string;
  agent?: string;
  confidence?: number;
  recommendation?: string;
  message?: string;
  error?: string;
}

export class CRAGSidecarClient {
  private config: SidecarConfig;
  private isHealthy: boolean = true;
  private lastHealthCheck: number = 0;
  private readonly healthCheckInterval = 60000; // 1 minute

  constructor(config: Partial<SidecarConfig> = {}) {
    this.config = {
      baseUrl: process.env.CRAG_SIDECAR_URL || 'http://localhost:8001',
      timeoutMs: 5000, // 5 second timeout
      retries: 2,
      enabled: process.env.CRAG_SIDECAR_ENABLED === 'true',
      ...config
    };
  }

  /**
   * Process query through sidecar with graceful fallback
   */
  async processQuery(
    query: string, 
    agent: string, 
    context?: any
  ): Promise<SidecarResponse | null> {
    if (!this.config.enabled) {
      console.log('🔄 CRAG Sidecar disabled, using main processing');
      return null;
    }

    // Check health status
    await this.checkHealth();
    if (!this.isHealthy) {
      console.log('⚠️ CRAG Sidecar unhealthy, using main processing');
      return null;
    }

    let attempts = 0;
    while (attempts < this.config.retries) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

        const response = await fetch(`${this.config.baseUrl}/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ query, agent, context }),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result: SidecarResponse = await response.json();
        
        if (result.success && result.fromCache) {
          console.log(`⚡ CRAG Sidecar cache hit (${result.processingTimeMs}ms)`);
        } else if (result.success) {
          console.log(`🔄 CRAG Sidecar recommends: ${result.recommendation}`);
        }

        return result;

      } catch (error) {
        attempts++;
        console.warn(`❌ CRAG Sidecar attempt ${attempts} failed:`, error);

        if (attempts >= this.config.retries) {
          this.isHealthy = false;
          console.log('🚨 CRAG Sidecar marked as unhealthy, falling back to main processing');
          return null;
        }

        // Wait before retry
        await this.delay(100 * attempts);
      }
    }

    return null;
  }

  /**
   * Check sidecar health
   */
  private async checkHealth(): Promise<void> {
    const now = Date.now();
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return; // Skip if checked recently
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout for health

      const response = await fetch(`${this.config.baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const health = await response.json();
        this.isHealthy = health.status === 'healthy';
        console.log(`🩺 CRAG Sidecar health: ${this.isHealthy ? 'healthy' : 'unhealthy'}`);
      } else {
        this.isHealthy = false;
      }

    } catch (error) {
      this.isHealthy = false;
      console.warn('⚠️ CRAG Sidecar health check failed:', error);
    }

    this.lastHealthCheck = now;
  }

  /**
   * Get sidecar statistics
   */
  async getStats(hours: number = 24): Promise<any> {
    if (!this.config.enabled || !this.isHealthy) {
      return null;
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/monitor/stats?hours=${hours}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Failed to get sidecar stats:', error);
    }

    return null;
  }

  /**
   * Warm sidecar cache
   */
  async warmCache(): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/cache/warm`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const result = await response.json();
        console.log('🔥 CRAG Sidecar cache warming:', result.message);
        return result.success;
      }
    } catch (error) {
      console.warn('Failed to warm sidecar cache:', error);
    }

    return false;
  }

  /**
   * Check if sidecar is enabled and healthy
   */
  isAvailable(): boolean {
    return this.config.enabled && this.isHealthy;
  }

  /**
   * Get sidecar configuration
   */
  getConfig(): SidecarConfig {
    return { ...this.config };
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}