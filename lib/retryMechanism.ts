// Retry Mechanism with Exponential Backoff
// Enterprise-grade API resilience

interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableStatuses?: number[];
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
  onRetry: () => {},
};

export class RetryError extends Error {
  constructor(
    message: string,
    public attempts: number,
    public lastError: Error
  ) {
    super(message);
    this.name = 'RetryError';
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function calculateDelay(attempt: number, config: Required<RetryConfig>): number {
  const exponentialDelay = config.initialDelay * Math.pow(config.backoffMultiplier, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // Add 0-30% jitter
  return Math.min(exponentialDelay + jitter, config.maxDelay);
}

function isRetryable(error: any, config: Required<RetryConfig>): boolean {
  // Network errors
  if (error.name === 'TypeError' && error.message.includes('fetch')) {
    return true;
  }

  // HTTP status codes
  if (error.response?.status) {
    return config.retryableStatuses.includes(error.response.status);
  }

  // Timeout errors
  if (error.name === 'AbortError' || error.code === 'ETIMEDOUT') {
    return true;
  }

  return false;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = {}
): Promise<T> {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  let lastError: Error;

  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if not retryable or max retries reached
      if (!isRetryable(error, finalConfig) || attempt === finalConfig.maxRetries) {
        throw new RetryError(
          `Failed after ${attempt + 1} attempts: ${lastError.message}`,
          attempt + 1,
          lastError
        );
      }

      // Calculate delay and wait
      const delayMs = calculateDelay(attempt, finalConfig);
      finalConfig.onRetry(attempt + 1, lastError);
      
      console.warn(
        `[Retry] Attempt ${attempt + 1}/${finalConfig.maxRetries} failed. Retrying in ${delayMs}ms...`,
        lastError.message
      );

      await delay(delayMs);
    }
  }

  throw new RetryError(
    `Failed after ${finalConfig.maxRetries + 1} attempts`,
    finalConfig.maxRetries + 1,
    lastError!
  );
}

// Fetch wrapper with retry
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryConfig: RetryConfig = {}
): Promise<Response> {
  return withRetry(async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      if (!response.ok) {
        const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.response = response;
        throw error;
      }

      return response;
    } finally {
      clearTimeout(timeout);
    }
  }, retryConfig);
}

// Batch retry for multiple operations
export async function batchWithRetry<T>(
  operations: (() => Promise<T>)[],
  config: RetryConfig & { concurrency?: number } = {}
): Promise<T[]> {
  const concurrency = config.concurrency || 5;
  const results: T[] = [];
  
  for (let i = 0; i < operations.length; i += concurrency) {
    const batch = operations.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(op => withRetry(op, config))
    );
    results.push(...batchResults);
  }

  return results;
}

// Circuit breaker pattern
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold = 5,
    private timeout = 60000,
    private onStateChange?: (state: string) => void
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.setState('HALF_OPEN');
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    if (this.state === 'HALF_OPEN') {
      this.setState('CLOSED');
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= this.threshold) {
      this.setState('OPEN');
    }
  }

  private setState(newState: 'CLOSED' | 'OPEN' | 'HALF_OPEN') {
    this.state = newState;
    this.onStateChange?.(newState);
  }

  getState() {
    return this.state;
  }

  reset() {
    this.failures = 0;
    this.setState('CLOSED');
  }
}
