import { Request, Response, NextFunction } from 'express';
import NodeCache from 'node-cache';

const cache = new NodeCache();

export const cacheMiddleware = (durationInSeconds: number) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

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
  } else {
    cache.flushAll();
  }
};
