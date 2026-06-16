// Request Queue for Offline Support
// Handles failed requests and retries when connection is restored

interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body?: any;
  headers?: Record<string, string>;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

class RequestQueue {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private storageKey = 'tb-pwa-request-queue';

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadQueue();
      this.setupOnlineListener();
    }
  }

  private loadQueue() {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.queue = JSON.parse(stored);
      }
    } catch (error) {
      console.error('[Queue] Failed to load queue:', error);
    }
  }

  private saveQueue() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.queue));
    } catch (error) {
      console.error('[Queue] Failed to save queue:', error);
    }
  }

  private setupOnlineListener() {
    window.addEventListener('online', () => {
      console.log('[Queue] Connection restored, processing queue');
      this.processQueue();
    });
  }

  enqueue(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retries'>) {
    const queuedRequest: QueuedRequest = {
      ...request,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      retries: 0,
    };

    this.queue.push(queuedRequest);
    this.saveQueue();
    
    if (navigator.onLine) {
      this.processQueue();
    }
  }

  async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;

    while (this.queue.length > 0 && navigator.onLine) {
      const request = this.queue[0];

      try {
        await fetch(request.url, {
          method: request.method,
          headers: request.headers,
          body: request.body ? JSON.stringify(request.body) : undefined,
        });

        this.queue.shift();
        this.saveQueue();
      } catch (error) {
        request.retries++;
        
        if (request.retries >= request.maxRetries) {
          console.error('[Queue] Max retries reached, removing request:', request);
          this.queue.shift();
        } else {
          console.warn('[Queue] Request failed, will retry:', request);
          this.queue.shift();
          this.queue.push(request);
        }
        
        this.saveQueue();
        break;
      }
    }

    this.processing = false;
  }

  getQueueSize() {
    return this.queue.length;
  }

  clearQueue() {
    this.queue = [];
    this.saveQueue();
  }
}

export const requestQueue = new RequestQueue();
