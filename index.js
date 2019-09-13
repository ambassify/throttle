function noop(v) { return v; }
function is(v, type) { return typeof v === type; }
function isFunction(v) { return is(v, 'function'); }
function isPromise(v) {
    return v && isFunction(v.then) && isFunction(v.catch);
}

function rejectFailedPromise(item) {
    var value = item.value;

    // Don't allow failed promises to be cached
    if (!isPromise(value))
        return;

    value.catch(item.clear);
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
    var resolver = options.resolver || noop;

    if (isFunction(options)) {
        resolver = options;
        options = {};
    }

    // Method that allows clearing the cache based on the value being cached.
    var onCached = getOnCached(options);

    var cache = options.cache || new Map();

    function execute() {
        var args = [], args_i = arguments.length;
        while (args_i-- > 0) args[args_i] = arguments[args_i];

        // If there is no timeout set we simply call `func`
        if (!timeout || timeout < 1)
            return func.apply(null, args);

        var key = resolver.apply(null, args);
        var value = null;
        var clear = null;
        var timer = null;

        // Populate the cache when there is nothing there yet.
        if (!cache.has(key)) {
            value = func.apply(null, args);
            clear = function() { cache.delete(key); };
            timer = setTimeout(clear, timeout);

            var cacheItem = {
                key: key,
                value: value,
                clear: clear,

                // Clear cache after timeout
                timeout: timer
            };

            cache.set(key, cacheItem);

            if (typeof timer.unref === 'function')
                timer.unref();

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

        var key = resolver.apply(null, args);
        cache.delete(key);
    };

    return execute;
};

module.exports.rejectFailedPromise = rejectFailedPromise;
