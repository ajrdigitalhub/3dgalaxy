import { Request, Response, NextFunction } from 'express';
import NodeCache from 'node-cache';

const cache = new NodeCache();

export const cacheMiddleware = (durationInSeconds: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Bypass cache if requested via query or header, or if request originates from Admin Portal
    const isBypass =
      req.query.refresh === 'true' ||
      req.query.bypassCache === 'true' ||
      req.headers['x-bypass-cache'] === 'true' ||
      req.headers['x-admin-portal'] === 'true' ||
      (typeof req.headers['cache-control'] === 'string' && req.headers['cache-control'].includes('no-cache'));

    if (isBypass) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('X-Cache', 'BYPASS');
      return next();
    }

    // Set HTTP Cache-Control headers: max-age=0 prevents client browsers from blindly serving from disk cache,
    // while s-maxage allows Edge/CDN shared caches (Firebase CDN / Cloud Run) to cache efficiently.
    res.setHeader(
      'Cache-Control',
      `public, max-age=0, s-maxage=${durationInSeconds}, must-revalidate`
    );

    const cacheKey = req.originalUrl || req.url;
    const cachedResponse = cache.get(cacheKey);

    if (cachedResponse) {
      console.log(`[CACHE HIT] ${cacheKey}`);
      res.setHeader('X-Cache', 'HIT');
      return res.json(cachedResponse);
    }

    res.setHeader('X-Cache', 'MISS');

    // Hijack res.json to cache the response body
    const originalJson = res.json.bind(res);
    res.json = ((body: any) => {
      cache.set(cacheKey, body, durationInSeconds);
      return originalJson(body);
    }) as any;

    next();
  };
};

export const clearCache = (cacheKey?: string) => {
  if (cacheKey) {
    cache.del(cacheKey);
    const allKeys = cache.keys();
    for (const key of allKeys) {
      if (key.startsWith(cacheKey) || key.includes(cacheKey)) {
        cache.del(key);
      }
    }
  } else {
    cache.flushAll();
  }
};
