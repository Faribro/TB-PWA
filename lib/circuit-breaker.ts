interface CircuitBreakerOptions {
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
  fallback?: () => any;
}

export async function withCircuitBreaker<T>(
  fn: () => Promise<T>,
  options: CircuitBreakerOptions = {}
): Promise<T> {
  const {
    timeout = 5000,
    maxRetries = 3,
    retryDelay = 1000,
    fallback
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Circuit breaker timeout')), timeout)
      );

      const result = await Promise.race([fn(), timeoutPromise]);
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }

  if (fallback) {
    console.warn('[CircuitBreaker] All retries failed, using fallback');
    return fallback();
  }

  throw lastError || new Error('Circuit breaker failed');
}
