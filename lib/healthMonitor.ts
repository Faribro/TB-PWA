// Health Check System
// Monitors service availability and performance

interface HealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'down';
  latency: number;
  lastCheck: number;
  error?: string;
}

class HealthMonitor {
  private statuses = new Map<string, HealthStatus>();
  private checkInterval = 60000; // 1 minute
  private intervalId?: NodeJS.Timeout;

  constructor() {
    if (typeof window !== 'undefined') {
      this.startMonitoring();
    }
  }

  private startMonitoring() {
    this.checkAll();
    this.intervalId = setInterval(() => this.checkAll(), this.checkInterval);
  }

  async checkService(name: string, url: string, timeout = 5000): Promise<HealthStatus> {
    const startTime = performance.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const latency = performance.now() - startTime;

      const status: HealthStatus = {
        service: name,
        status: response.ok ? 'healthy' : 'degraded',
        latency,
        lastCheck: Date.now(),
      };

      this.statuses.set(name, status);
      return status;
    } catch (error) {
      const status: HealthStatus = {
        service: name,
        status: 'down',
        latency: performance.now() - startTime,
        lastCheck: Date.now(),
        error: (error as Error).message,
      };

      this.statuses.set(name, status);
      return status;
    }
  }

  async checkAll() {
    const checks = [
      this.checkService('supabase', process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/'),
      this.checkService('auth', '/api/auth/session'),
    ];

    await Promise.allSettled(checks);
  }

  getStatus(service: string): HealthStatus | undefined {
    return this.statuses.get(service);
  }

  getAllStatuses(): HealthStatus[] {
    return Array.from(this.statuses.values());
  }

  isHealthy(): boolean {
    return Array.from(this.statuses.values()).every(s => s.status === 'healthy');
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }
}

export const healthMonitor = new HealthMonitor();
