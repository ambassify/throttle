module.exports = function(func, timeout, resolver) {
    // By default uses first argument as cache key.
    resolver = resolver || (v => v);

    // Timeout in milliseconds
    timeout = parseInt(timeout, 10);

    const cache = {};

    return (...args) => {
        // If there is no timeout set we simply call `func`
        if (!timeout || timeout < 1)
            return func(...args);

        const key = resolver(...args);

        // Populate the cache when there is nothing there yet.
        if (typeof cache[key] === 'undefined') {
            cache[key] = { value: func(...args) };

            // Clear cache after timeout
            setTimeout(() => { delete cache[key]; }, timeout);
        }

        return cache[key].value;
    };
};
