export class MemoryCache {
  private store = new Map<string, { value: any; expiresAt: number }>();

  get(key: string): any | null {
    const record = this.store.get(key);
    if (!record) return null;
    if (Date.now() > record.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return record.value;
  }

  set(key: string, value: any, ttlSec: number): void {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSec * 1000
    });
  }

  del(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }

  // Helper to clear pattern matching keys (e.g. "products_")
  clearPattern(pattern: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(pattern)) {
        this.store.delete(key);
      }
    }
  }
}

export const sysCache = new MemoryCache();
export default sysCache;
