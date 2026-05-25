const DEFAULT_MAX_ENTRIES = 200;

function pruneExpired(cache, now = Date.now()) {
  for (const [key, value] of cache.entries()) {
    if (!value || value.expiresAt <= now) {
      cache.delete(key);
    }
  }
}

export function getCachedValue(cache, key) {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }

  if (entry.expiresAt <= Date.now()) {
    cache.delete(key);
    return null;
  }

  return entry.value;
}

export function setCachedValue(cache, key, value, ttlMs, maxEntries = DEFAULT_MAX_ENTRIES) {
  pruneExpired(cache);

  if (cache.size >= maxEntries && !cache.has(key)) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey !== undefined) {
      cache.delete(oldestKey);
    }
  }

  cache.set(key, {
    value,
    expiresAt: Date.now() + ttlMs,
  });
}
