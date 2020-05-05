var LruCache = require('./cache/lru');
var weak = require('./weakref');
var hash = require('hash-it').default;

function noop(v) { return v; }
function is(v, type) { return typeof v === type; }
function isFunction(v) { return is(v, 'function'); }
function isNumber(v) { return is(v, 'number'); }
function isPromise(v) {
    return v && isFunction(v.then) && isFunction(v.catch);
}

function toResolverKey(value) {
    if (Array.isArray(value) && value.length == 1)
        return toResolverKey(value[0]);

    if (typeof value != 'object' || !value)
        return String(value);

    return hash(value);
}

function defaultResolver() {
    var args = [], args_i = arguments.length;
    while (args_i-- > 0) args[args_i] = arguments[args_i];

    return args;
}

function rejectFailedPromise(item) {
    var value = item.value;

    // Don't allow failed promises to be cached
    if (!isPromise(value))
        return;

    value.catch(item.clear);
}

function getCache(options) {
    if (options.cache)
        return options.cache;

    if (isNumber(options.maxSize) && options.maxSize < Infinity)
        return new LruCache({ maxSize: options.maxSize });

    return new Map();
}

function getOnCached(options) {
    var onCached = options.onCached;

    if (!options.rejectFailedPromise)
        return onCached || noop;

    // Cache promises that result in rejection
    if (!isFunction(onCached))
        return rejectFailedPromise;

    return function(item) {
        rejectFailedPromise(item);
        onCached(item);
    };
}

module.exports = function(func, timeout, options) {
    options = options || {};

    // Timeout in milliseconds
    timeout = parseInt(timeout, 10);

    // By default uses first argument as cache key.
    var resolver = options.resolver || defaultResolver;

    if (isFunction(options)) {
        resolver = options;
        options = {};
    }

    var cache = getCache(options);
    /**
     * This creates a weak reference in nodejs.
     *
     * A WeakRef ensures that the cache can be garbage collected once it is
     * longer accessible. If we were not using a WeakRef the setTimeout
     * would keep a reference, keeping the data alive until the timer
     * expires.
     */
    var weakCache = weak(cache);

    // Method that allows clearing the cache based on the value being cached.
    var onCached = getOnCached(options);

    function execute() {
        var args = [], args_i = arguments.length;
        while (args_i-- > 0) args[args_i] = arguments[args_i];

        // If there is no timeout set we simply call `func`
        if (!timeout || timeout < 1)
            return func.apply(null, args);

        var key = toResolverKey(resolver.apply(null, args));
        var value = null;
        var clear = null;
        var timer = null;
        var applyTimeout = null;

        function cancelTimeout() {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
        }

        // Populate the cache when there is nothing there yet.
        if (!cache.has(key)) {
            value = func.apply(null, args);

            clear = function () {
                cancelTimeout();
                if (!weak.isDead(weakCache))
                    weak.get(weakCache).delete(key);
            };

            applyTimeout = function (newTimeout) {
                cancelTimeout();

                timer = setTimeout(clear, newTimeout);

                if (typeof timer.unref === 'function')
                    timer.unref();
            };

            var cacheItem = {
                key: key,
                value: value,
                clear: clear,
                ttl: applyTimeout
            };

            cache.set(key, cacheItem);

            applyTimeout(timeout);
            onCached(cacheItem);
        }

        return cache.get(key).value;
    }

    execute.clear = function clear() {
        if (arguments.length < 1) {
            cache.clear();
            return;
        }

        var args = [], args_i = arguments.length;
        while (args_i-- > 0) args[args_i] = arguments[args_i];

        var key = toResolverKey(resolver.apply(null, args));
        cache.delete(key);
    };

    return execute;
};

module.exports.rejectFailedPromise = rejectFailedPromise;
