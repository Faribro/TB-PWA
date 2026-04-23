/**
 * Circuit Breaker Pattern for API Resilience
 * 
 * Prevents cascading failures by:
 * 1. Tracking failure rates
 * 2. Opening circuit after threshold
 * 3. Half-open state for recovery testing
 * 4. Automatic recovery
 */

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

class CircuitBreaker {
  private state: CircuitBreakerState = {
    failures: 0,
    lastFailureTime: 0,
    state: 'CLOSED',
  };

  private readonly failureThreshold = 5; // Open after 5 failures
  private readonly timeout = 60000; // Try recovery after 60s
  private readonly successThreshold = 2; // Close after 2 successes in half-open

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state.state === 'OPEN') {
      // Check if timeout has passed
      if (Date.now() - this.state.lastFailureTime > this.timeout) {
        console.log('[CircuitBreaker] Entering HALF_OPEN state');
        this.state.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    if (this.state.state === 'HALF_OPEN') {
      console.log('[CircuitBreaker] Success in HALF_OPEN, closing circuit');
      this.state = {
        failures: 0,
        lastFailureTime: 0,
        state: 'CLOSED',
      };
    } else {
      this.state.failures = 0;
    }
  }

  private onFailure() {
    this.state.failures++;
    this.state.lastFailureTime = Date.now();

    if (this.state.failures >= this.failureThreshold) {
      console.error('[CircuitBreaker] Threshold reached, opening circuit');
      this.state.state = 'OPEN';
    }
  }

  getState() {
    return this.state.state;
  }
}

// Global circuit breakers for different services
export const patientsCircuitBreaker = new CircuitBreaker();
export const metricsCircuitBreaker = new CircuitBreaker();
