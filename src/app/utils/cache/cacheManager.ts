
import NodeCache from 'node-cache';

export const cache = new NodeCache({
  stdTTL: 1800,
  checkperiod: 300,
  useClones: false,
  deleteOnExpire: true,
  maxKeys: 10000,
});

// Cache configuration for different sections
export const CACHE_CONFIG = {
  TASKS: {
    ttl: 18000,
    prefix: 'tasks:',
  },
  USERS: {
    ttl: 7200,
    prefix: 'users:',
  },
  POSTS: {
    ttl: 3600,
    prefix: 'posts:',
  },
  // Add more as needed
};

// ============================================
// GENERIC CACHE KEY GENERATOR
// ============================================
export class CacheKeyGenerator {
  static list(prefix: string, query?: Record<string, any>): string {
    if (!query || Object.keys(query).length === 0) {
      return `${prefix}all`;
    }

    const queryString = Object.keys(query)
      .sort()
      .map(key => {
        const value = query[key];
        if (Array.isArray(value)) {
          return `${key}:${value.sort().join(',')}`;
        }
        if (typeof value === 'object' && value !== null) {
          return `${key}:${JSON.stringify(value)}`;
        }
        return `${key}:${value}`;
      })
      .join('|');

    return `${prefix}all:${queryString}`;
  }

  static byId(prefix: string, id: string): string {
    return `${prefix}id:${id}`;
  }

  static byUserId(prefix: string, userId: string, subKey?: string): string {
    return subKey
      ? `${prefix}user:${userId}:${subKey}`
      : `${prefix}user:${userId}`;
  }

  static custom(prefix: string, ...params: string[]): string {
    return `${prefix}${params.join(':')}`;
  }
}

// ============================================
// BASIC CACHE MANAGER
// ============================================
export class CacheManager {
  static get<T>(key: string): T | undefined {
    const cached = cache.get<T>(key);
    if (cached) {
      console.log(`✅ Cache HIT: ${key}`);
      return cached;
    }
    console.log(`❌ Cache MISS: ${key}`);
    return undefined;
  }

  static set<T>(key: string, value: T, ttl?: number): boolean {
    const success = cache.set(key, value, ttl || 0);
    if (success) {
      console.log(`💾 Cache SET: ${key} (TTL: ${ttl || 'default'}s)`);
    }
    return success;
  }

  static delete(key: string): number {
    const deleted = cache.del(key);
    if (deleted > 0) {
      console.log(`🗑️  Cache DELETED: ${key}`);
    }
    return deleted;
  }

  static invalidateByPrefix(prefix: string): number {
    const keys = cache.keys();
    const matchingKeys = keys.filter(key => key.startsWith(prefix));
    matchingKeys.forEach(key => cache.del(key));
    console.log(
      `🗑️  Cache INVALIDATED: ${matchingKeys.length} keys with prefix '${prefix}'`,
    );
    return matchingKeys.length;
  }

  static invalidateByPattern(pattern: string | RegExp): number {
    const keys = cache.keys();
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    const matchingKeys = keys.filter(key => regex.test(key));
    matchingKeys.forEach(key => cache.del(key));
    console.log(
      `🗑️  Cache INVALIDATED: ${matchingKeys.length} keys matching pattern`,
    );
    return matchingKeys.length;
  }

  static flush(): void {
    cache.flushAll();
    console.log('🗑️  Cache FLUSHED: All keys deleted');
  }

  static getStats() {
    return cache.getStats();
  }

  static getKeys(): string[] {
    return cache.keys();
  }

  static getKeysByPrefix(prefix: string): string[] {
    return cache.keys().filter(key => key.startsWith(prefix));
  }
}

// ============================================
// DYNAMIC SMART CACHE UPDATER
// ============================================

export interface SmartCacheOptions<T> {
  prefix: string;
  ttl: number;
  idField?: string; // Default: 'id'
  userIdField?: string; // Default: 'userId'
  enrichFunction?: (item: T) => T; // Optional data enrichment
  sortField?: string; // For maintaining order in lists
  sortOrder?: 'asc' | 'desc'; // Default: 'desc'
}

export class SmartCacheUpdater<T extends Record<string, any>> {
  private options: Required<SmartCacheOptions<T>>;

  constructor(options: SmartCacheOptions<T>) {
    this.options = {
      idField: 'id',
      userIdField: 'userId',
      enrichFunction: (item: T) => item,
      sortField: 'createdAt',
      sortOrder: 'desc',
      ...options,
    };
  }

  /**
   * Add new item to cache (first page only)
   */
  add(newItem: T): void {
    const { prefix, ttl, enrichFunction, sortOrder } = this.options;
    const userId = newItem[this.options.userIdField];

    if (!userId) {
      console.warn('⚠️  No userId found, skipping cache add');
      return;
    }

    const enrichedItem = enrichFunction(newItem);
    const listCacheKeys = CacheManager.getKeysByPrefix(prefix);
    let addedToLists = 0;

    for (const cacheKey of listCacheKeys) {
      // Skip single item caches
      if (cacheKey.includes(':id:')) continue;

      // Only add to user's caches
      if (!cacheKey.includes(`userId:${userId}`)) continue;

      // Only add to first page
      if (!cacheKey.includes('page:1')) continue;

      const cached = CacheManager.get<any>(cacheKey);
      if (!cached || !cached.data) continue;

      // Add to beginning or end based on sort order
      if (sortOrder === 'desc') {
        cached.data.unshift(enrichedItem);
      } else {
        cached.data.push(enrichedItem);
      }

      cached.meta.total += 1;

      // Maintain page limit
      if (cached.data.length > cached.meta.limit) {
        if (sortOrder === 'desc') {
          cached.data.pop();
        } else {
          cached.data.shift();
        }
      }

      CacheManager.set(cacheKey, cached, ttl);
      addedToLists++;
    }

    console.log(`➕ Added new item to ${addedToLists} list caches`);
  }

  /**
   * Update item in all caches
   */
  update(itemId: string, updatedItem: T): void {
    const { prefix, ttl, idField, enrichFunction } = this.options;
    const enrichedItem = enrichFunction(updatedItem);

    // 1. Update single item cache
    const itemCacheKey = CacheKeyGenerator.byId(prefix, itemId);
    CacheManager.set(itemCacheKey, enrichedItem, ttl);
    console.log(`🔄 Updated item in cache: ${itemId}`);

    // 2. Update in all list caches
    const listCacheKeys = CacheManager.getKeysByPrefix(prefix);
    let updatedLists = 0;

    for (const cacheKey of listCacheKeys) {
      if (cacheKey.includes(':id:')) continue;

      const cached = CacheManager.get<any>(cacheKey);
      if (!cached || !cached.data) continue;

      const itemIndex = cached.data.findIndex(
        (item: any) => item[idField] === itemId,
      );

      if (itemIndex !== -1) {
        cached.data[itemIndex] = enrichedItem;
        CacheManager.set(cacheKey, cached, ttl);
        updatedLists++;
      }
    }

    console.log(`✅ Updated item in ${updatedLists} list caches`);
  }

  /**
   * Remove item from all caches
   */
  remove(itemId: string, userId?: string): void {
    const { prefix, idField } = this.options;

    // 1. Remove single item cache
    const itemCacheKey = CacheKeyGenerator.byId(prefix, itemId);
    CacheManager.delete(itemCacheKey);

    // 2. Remove from all list caches
    const listCacheKeys = CacheManager.getKeysByPrefix(prefix);
    let updatedLists = 0;

    for (const cacheKey of listCacheKeys) {
      if (cacheKey.includes(':id:')) continue;

      // If userId provided, only update user's caches
      if (userId && !cacheKey.includes(`userId:${userId}`)) continue;

      const cached = CacheManager.get<any>(cacheKey);
      if (!cached || !cached.data) continue;

      const itemIndex = cached.data.findIndex(
        (item: any) => item[idField] === itemId,
      );

      if (itemIndex !== -1) {
        cached.data.splice(itemIndex, 1);
        cached.meta.total -= 1;
        CacheManager.set(cacheKey, cached, this.options.ttl);
        updatedLists++;
      }
    }

    console.log(`🗑️  Removed item from ${updatedLists} list caches`);
  }

  /**
   * Batch update multiple items
   */
  batchUpdate(updates: Array<{ id: string; data: T }>): void {
    console.log(`🔄 Starting batch update of ${updates.length} items...`);

    for (const { id, data } of updates) {
      this.update(id, data);
    }

    console.log(`✅ Batch update completed`);
  }

  /**
   * Update items matching a condition in all caches
   */
  updateWhere(condition: (item: T) => boolean, updateFn: (item: T) => T): void {
    const { prefix, ttl } = this.options;
    const listCacheKeys = CacheManager.getKeysByPrefix(prefix);
    let totalUpdated = 0;

    for (const cacheKey of listCacheKeys) {
      if (cacheKey.includes(':id:')) continue;

      const cached = CacheManager.get<any>(cacheKey);
      if (!cached || !cached.data) continue;

      let updated = false;
      cached.data = cached.data.map((item: T) => {
        if (condition(item)) {
          updated = true;
          totalUpdated++;
          return updateFn(item);
        }
        return item;
      });

      if (updated) {
        CacheManager.set(cacheKey, cached, ttl);
      }
    }

    console.log(`🔄 Updated ${totalUpdated} items matching condition`);
  }

  /**
   * Fallback: Full invalidation
   */
  invalidateAll(): void {
    CacheManager.invalidateByPrefix(this.options.prefix);
  }
}

// ============================================
// HELPER: WITH CACHE WRAPPER
// ============================================
export async function withCache<T>(
  cacheKey: string,
  fetchFunction: () => Promise<T>,
  ttl?: number,
): Promise<T> {
  const cached = CacheManager.get<T>(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  console.log(`🔄 Fetching from DB: ${cacheKey}`);
  const result = await fetchFunction();
  CacheManager.set(cacheKey, result, ttl);

  return result;
}

// ============================================
// CACHE INFO
// ============================================
export const getCacheInfo = () => {
  const stats = CacheManager.getStats();
  const keys = CacheManager.getKeys();

  const keysBySection: Record<string, number> = {};
  keys.forEach(key => {
    const prefix = key.split(':')[0] + ':';
    keysBySection[prefix] = (keysBySection[prefix] || 0) + 1;
  });

  return {
    stats,
    totalKeys: keys.length,
    keysBySection,
    sampleKeys: keys.slice(0, 20),
  };
};