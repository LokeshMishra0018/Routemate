import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

export interface SystemMetricsSnapshot {
  uptimeSeconds: number;
  memoryUsageMb: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  requests: {
    total: number;
    rpm: number;
    status2xx: number;
    status4xx: number;
    status5xx: number;
    errorRatePercent: number;
  };
  latencyMs: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
}

class MetricsCollector {
  private startTime = Date.now();
  private totalRequests = 0;
  private status2xx = 0;
  private status4xx = 0;
  private status5xx = 0;
  private latencySamples: number[] = [];
  private maxLatencySamples = 1000;
  private minuteBuckets: number[] = [];

  constructor() {
    // Reset RPM rolling window every 60 seconds
    setInterval(() => {
      this.minuteBuckets.push(0);
      if (this.minuteBuckets.length > 60) {
        this.minuteBuckets.shift();
      }
    }, 60000).unref?.();
  }

  recordRequest(reply: FastifyReply, durationMs: number): void {
    this.totalRequests += 1;
    const statusCode = reply.statusCode;

    if (statusCode >= 200 && statusCode < 400) {
      this.status2xx += 1;
    } else if (statusCode >= 400 && statusCode < 500) {
      this.status4xx += 1;
    } else if (statusCode >= 500) {
      this.status5xx += 1;
    }

    if (this.minuteBuckets.length === 0) {
      this.minuteBuckets.push(1);
    } else {
      this.minuteBuckets[this.minuteBuckets.length - 1] += 1;
    }

    this.latencySamples.push(durationMs);
    if (this.latencySamples.length > this.maxLatencySamples) {
      this.latencySamples.shift();
    }
  }

  getSnapshot(): SystemMetricsSnapshot {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    const mem = process.memoryUsage();

    const memMb = {
      rss: Math.round(mem.rss / (1024 * 1024)),
      heapTotal: Math.round(mem.heapTotal / (1024 * 1024)),
      heapUsed: Math.round(mem.heapUsed / (1024 * 1024)),
      external: Math.round(mem.external / (1024 * 1024)),
    };

    // Calculate percentiles
    const sortedLatencies = [...this.latencySamples].sort((a, b) => a - b);
    const count = sortedLatencies.length;
    let avg = 0;
    let p50 = 0;
    let p95 = 0;
    let p99 = 0;

    if (count > 0) {
      const sum = sortedLatencies.reduce((acc, val) => acc + val, 0);
      avg = Math.round(sum / count);
      p50 = Math.round(sortedLatencies[Math.floor(count * 0.5)]);
      p95 = Math.round(sortedLatencies[Math.floor(count * 0.95)]);
      p99 = Math.round(sortedLatencies[Math.floor(count * 0.99)] || sortedLatencies[count - 1]);
    }

    const currentMinuteRpm = this.minuteBuckets[this.minuteBuckets.length - 1] || 0;
    const errorCount = this.status4xx + this.status5xx;
    const errorRatePercent =
      this.totalRequests > 0 ? Number(((errorCount / this.totalRequests) * 100).toFixed(1)) : 0;

    return {
      uptimeSeconds,
      memoryUsageMb: memMb,
      requests: {
        total: this.totalRequests,
        rpm: currentMinuteRpm,
        status2xx: this.status2xx,
        status4xx: this.status4xx,
        status5xx: this.status5xx,
        errorRatePercent,
      },
      latencyMs: {
        avg,
        p50,
        p95,
        p99,
      },
    };
  }
}

export const metricsCollector = new MetricsCollector();

/**
 * Fastify hook plugin to record HTTP request latency and metrics
 */
export async function registerMetricsHook(app: FastifyInstance): Promise<void> {
  app.addHook('onRequest', async (request: FastifyRequest) => {
    (request as any).__startTime = Date.now();
  });

  app.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const startTime = (request as any).__startTime;
    if (startTime) {
      const duration = Date.now() - startTime;
      metricsCollector.recordRequest(reply, duration);
    }
  });
}
