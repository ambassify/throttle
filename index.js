function noop(v) { return v; }

module.exports = function(func, timeout, resolver) {
    // By default uses first argument as cache key.
    resolver = resolver || noop;

    // Timeout in milliseconds
    timeout = parseInt(timeout, 10);

    var cache = {};

    function execute() {
        var args = [], args_i = arguments.length;
        while (args_i-- > 0) args[args_i] = arguments[args_i];

        // If there is no timeout set we simply call `func`
        if (!timeout || timeout < 1)
            return func.apply(null, args);

        var key = resolver.apply(null, args);

        // Populate the cache when there is nothing there yet.
        if (typeof cache[key] === 'undefined') {
            cache[key] = { value: func.apply(null, args) };

            // Clear cache after timeout
            setTimeout(function() { delete cache[key]; }, timeout);
        }

        return cache[key].value;
    }

    execute.clear = function clear() {
        if (arguments.length < 1) {
            cache = {};
            return;
        }

        var args = [], args_i = arguments.length;
        while (args_i-- > 0) args[args_i] = arguments[args_i];

        var key = resolver.apply(null, args);
        delete cache[key];
    };

    return execute;
};
