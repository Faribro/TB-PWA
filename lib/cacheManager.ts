// Advanced Caching Layer with IndexedDB
// Enterprise-grade offline support and data persistence

interface CacheConfig {
  name: string;
  version: number;
  stores: {
    name: string;
    keyPath: string;
    indexes?: { name: string; keyPath: string; unique?: boolean }[];
  }[];
}

interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  expiresAt?: number;
}

class CacheManager {
  private db: IDBDatabase | null = null;
  private dbName: string;
  private version: number;
  private stores: CacheConfig['stores'];

  constructor(config: CacheConfig) {
    this.dbName = config.name;
    this.version = config.version;
    this.stores = config.stores;
  }

  async init(): Promise<void> {
    if (typeof window === 'undefined') return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        this.stores.forEach((storeConfig) => {
          if (!db.objectStoreNames.contains(storeConfig.name)) {
            const store = db.createObjectStore(storeConfig.name, {
              keyPath: storeConfig.keyPath,
            });

            storeConfig.indexes?.forEach((index) => {
              store.createIndex(index.name, index.keyPath, {
                unique: index.unique || false,
              });
            });
          }
        });
      };
    });
  }

  async set<T>(storeName: string, key: string, value: T, ttl?: number): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) throw new Error('Database not initialized');

    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      expiresAt: ttl ? Date.now() + ttl : undefined,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(storeName: string, key: string): Promise<T | null> {
    if (!this.db) await this.init();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as CacheEntry<T> | undefined;
        
        if (!entry) {
          resolve(null);
          return;
        }

        // Check expiration
        if (entry.expiresAt && Date.now() > entry.expiresAt) {
          this.delete(storeName, key);
          resolve(null);
          return;
        }

        resolve(entry.value);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async delete(storeName: string, key: string): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async clear(storeName: string): Promise<void> {
    if (!this.db) await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string): Promise<T[]> {
    if (!this.db) await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        const entries = request.result as CacheEntry<T>[];
        const now = Date.now();
        
        const validEntries = entries
          .filter(entry => !entry.expiresAt || now <= entry.expiresAt)
          .map(entry => entry.value);

        resolve(validEntries);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async cleanExpired(storeName: string): Promise<number> {
    if (!this.db) await this.init();
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([storeName], 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.openCursor();
      let deletedCount = 0;
      const now = Date.now();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const entry = cursor.value as CacheEntry<any>;
          if (entry.expiresAt && now > entry.expiresAt) {
            cursor.delete();
            deletedCount++;
          }
          cursor.continue();
        } else {
          resolve(deletedCount);
        }
      };
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
export const cacheManager = new CacheManager({
  name: 'tb-pwa-cache',
  version: 1,
  stores: [
    {
      name: 'patients',
      keyPath: 'key',
      indexes: [
        { name: 'timestamp', keyPath: 'timestamp' },
      ],
    },
    {
      name: 'districts',
      keyPath: 'key',
    },
    {
      name: 'analytics',
      keyPath: 'key',
    },
    {
      name: 'metadata',
      keyPath: 'key',
    },
  ],
});

// Initialize on load
if (typeof window !== 'undefined') {
  cacheManager.init().catch(console.error);
  
  // Clean expired entries every 5 minutes
  setInterval(() => {
    cacheManager.cleanExpired('patients').catch(console.error);
    cacheManager.cleanExpired('districts').catch(console.error);
    cacheManager.cleanExpired('analytics').catch(console.error);
  }, 5 * 60 * 1000);
}

// Helper functions
export async function cachePatients(patients: any[]): Promise<void> {
  await cacheManager.set('patients', 'all', patients, 30 * 60 * 1000); // 30 min TTL
}

export async function getCachedPatients(): Promise<any[]> {
  try {
    const result = await cacheManager.get<any[]>('patients', 'all');
    return result ?? [];
  } catch {
    return [];
  }
}

export async function cacheDistricts(districts: any[]): Promise<void> {
  await cacheManager.set('districts', 'all', districts, 60 * 60 * 1000); // 1 hour TTL
}

export async function getCachedDistricts(): Promise<any[] | null> {
  return cacheManager.get('districts', 'all');
}
