/**
 * A module for throttling functions
 * @module @ambassify/throttle
 */

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
            .catch(err => onError(err, cacheItem))
            .finally(() => { cacheItem.pending = null; });

        return cacheItem.pending;
    } catch (err) {
        return onError(err, cacheItem);
    }
}

/**
 * @typedef {Object} ThrottleOptions
 *
 * @property {number} delay How much time must have been elapsed for `func` to
 *      be invoked again when there's a chached result available. Defaults to `Infinity`.
 *
 * @property {number?} maxAge How long are items allowed to remain in cache. Unlimited by default.
 * @property {number?} maxSize How long are items allowed to remain in cache. Unlimited by default.
 * @property {Map} cache Specify a custom cache for throttle to use. Must provide methods that match Map's equivalent: has, get, set, delete, clear
 * @property {Function} resolver Given the same arguments used to invoke `func` return only what's important to build the cache key.
 *
 * @property {Function} onUpdated Invoked with the `cacheItem` whenever the item is updated.
 *
 * @property {'clear' | 'cached' | 'persist' | Function} onError Error handler
 *      to use when "func" throws or rejects.
 *
 *      - `clear`: The cache is cleared and the error is thrown
 *      - `persist`: The error is saved into cache and thrown
 *      - `cached`: If a previous value is in cache, it will be returned, if not the error will be thrown
 *      - a custom function that receives the error as first param and cacheItem as the second, when specified
 *        the throttled function won't touch the cache when an error occurs, it's up to this handler
 *        to interact with cacheItem.
 */

/**
 * @typedef {Function} ThrottledFunction
 *
 * The throttled function.
 *
 * @property {Function} clear When invoked without any arguments the entire cache
 *      is cleared, when **are** supplied they are passed, the item for those
 *      arguments is removed from cache.
 */

/**
 * Creates a throttled version of `func`. `func` will only be invoked when its
 * result is not in the throttled function's cache or the time between the
 * current and last invocation is larger than what's specified by `delay`.
 *
 * If `func` is async, the throttled function will immediately return a value
 * from cache (if available) while `func` is executing.
 *
 * @param {Function} func The function to throttle
 * @param {ThrottleOptions} options
 * @returns {ThrottledFunction} The throttled version of "func"
 *
 * @alias module:@ambassify/throttle
 *
 * @example
 * const throttle = require('@ambassify/throttle');
 *
 * const throttled = throttle(<function-to-throttle>, <options>);
 *
 * throttled('hello');
 * throttled.clear(<...args>);
 */
function throttle(func, options = {}) {
    if (!isFunction(func))
        throw new Error('First parameter to throttle must be a function.');

    if (
        isNil(options.cache) &&
        isNil(options.maxAge) &&
        isNil(options.maxSize)
    ) throw new Error('No cache limitation options set, set at least one of "cache", "maxAge", or "maxSize".');

    const delay = options.delay ?? Infinity;
    const maxAge = options.maxAge || false;
    const resolver = options.resolver || defaultResolver;
    const cache = getCache({ ...options, maxAge, delay });
    const onError = getOnError(options);
    const onUpdated = options.onUpdated || noop;

    /*
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
                delay,
                weakCache,
                maxAge,
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

    /**
     * When invoked without any arguments the entire result cache is cleared, when
     * **are** supplied they are passed, the item for those arguments is removed
     * from cache.
     */
    throttled.clear = function clear(...args) {
        if (!args.length) {
            cache.clear();
            return;
        }

        const key = toResolverKey(resolver(...args));

        cache.delete(key);
    };

    return throttled;
}

module.exports = throttle;
