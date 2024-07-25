const hash = require('hash-it').default;

const LruCache = require('./cache/lru');
const CacheItem = require('./cache/item');
const { isNumber, isNil, isFunction, isPromise, noop, } = require('./utils');
const { weak } = require('./weakref');

const errorHandlers = {
    clear(err, cacheItem) {
        cacheItem.clear();
        throw err;
    },

    cached(err, cacheItem) {
        if (cacheItem.initialized)
            return cacheItem.value;

        throw err;
    },

    persist(err, cacheItem) {
        cacheItem.error = err;
        throw err;
    },
};

function defaultResolver(...args) {
    return args;
}

function toResolverKey(value) {
    if (Array.isArray(value) && value.length == 1)
        return toResolverKey(value[0]);

    if (typeof value != 'object' || !value)
        return String(value);

    return hash(value);
}

function getCache(options) {
    const { cache, maxSize } = options;

    if (cache)
        return cache;

    if (isNumber(maxSize) && maxSize < Infinity)
        return new LruCache({ maxSize });

    return new Map();
}

function getOnError(options = {}) {
    const { onError } = options;

    if (isFunction(onError))
        return onError;

    return errorHandlers[onError] || errorHandlers.cached;
}

function execute(func, args, { cacheItem, onError }) {
    try {
        const result = func(...args);

        if (!isPromise(result)) {
            cacheItem.value = result;
            return result;
        }

        cacheItem.pending = result
            .then(() => {
                cacheItem.value = result;
                return result;
            })
            .catch(err => onError(err, cacheItem));

        return cacheItem.pending;
    } catch (err) {
        return onError(err, cacheItem);
    }
}
/**
 *
 * @param {Function} func The function to throttle
 * @param {Number} refreshIn How often the cache should be refreshed
 * @param {ThrottleOptions} options
 * @returns
 */
module.exports = function throttle(func, refreshIn, options = {}) {

    if (refreshIn && typeof refreshIn === 'object') {
        options = refreshIn;
        refreshIn = options?.refreshIn;
    }

    refreshIn = parseInt(refreshIn, 10);

    // No need to throttle if func needs to be refreshed on every invocation
    if (!refreshIn || refreshIn < 1) {
        const notThrottled = (...args) => func(...args);
        notThrottled.clear = noop;
        return notThrottled;
    }

    /**
     * When no cache options are found, we default to a "maxAge" that matches
     * "refreshIn".
     *
     * @todo: this matches "old" throttle, meaning that to benefit from the new
     * improvements you will always have to pass options:
     * throttle(func, MINUTE, { maxAge: HOUR });
     * Is that what we want? Infinite cache on the other hand is prone to memory leaks
     */
    if (
        isNil(options.cache) &&
        isNil(options.maxAge) &&
        isNil(options.maxSize)
    ) options.maxAge = refreshIn;

    const resolver = options?.resolver || defaultResolver;
    const cache = getCache({ ...options, refreshIn });
    const onError = getOnError(options);
    const onUpdated = options?.onUpdated || noop;

    /**
     * This creates a weak reference in nodejs.
     *
     * A WeakRef ensures that the cache can be garbage collected once it is
     * longer accessible. If we were not using a WeakRef the setTimeout
     * would keep a reference, keeping the data alive until the timer
     * expires.
     */
    const weakCache = weak(cache);

    function throttled(...args) {
        const key = toResolverKey(resolver(...args));

        if (!cache.has(key)) {
            cache.set(key, new CacheItem({
                key,
                refreshIn,
                cache: weakCache,
                maxAge: options.maxAge,
                onUpdated,
            }));
        }

        const cacheItem = cache.get(key);

        if (cacheItem.stale)
            return execute(func, args, { cacheItem, onError });

        if (!cacheItem.initialized)
            return cacheItem.pending;

        if (cacheItem.error)
            throw cacheItem.error;

        return cacheItem.value;
    }

    throttled.clear = function clear(...args) {
        if (!args.length) {
            cache.clear();
            return;
        }

        const key = toResolverKey(resolver(...args));

        cache.delete(key);
    };

    return throttled;
};
