const { noop, isNil, isFunction } = require('../utils');
const { weak } = require('../weakref');

module.exports = class CacheItem {

    initialized = false;
    pending = null;
    key = null;

    #value = null;
    #error = null;
    #cache = null;
    #maxAge = null;
    #timer = null;
    #refreshIn = null;
    #refreshedAt = null;
    #onUpdated = noop;

    constructor({
        key,
        refreshIn,
        cache,
        maxAge,
        onUpdated
    }) {
        this.key = key;

        this.#cache = cache;
        this.#maxAge = maxAge;
        this.#refreshIn = refreshIn;
        this.#refreshedAt = null;
        this.#onUpdated = onUpdated;
    }

    get stale() {
        if (!this.#refreshedAt)
            return true;

        if (this.pending)
            return false;

        return this.#refreshedAt + this.#refreshIn < Date.now();
    }

    get value() {
        return this.#value;
    }

    set value(v) {
        this.#error = null;
        this.#value = v;

        this.#updated();
    }

    get error() {
        return this.#error;
    }

    set error(err) {
        // When setting an error for a pending promise, set is as a rejection
        // to make sure the throttled function doesn't throw is synchronously
        if (this.pending) {
            this.value = Promise.reject(err);
            return;
        }

        this.#error = err;
        this.#value = null;

        this.#updated();
    }

    #clearTimeout() {
        if (this.#timer) {
            clearTimeout(this.#timer);
            this.#timer = null;
        }
    }

    #updated() {
        this.initialized = true;
        this.pending = null;
        this.#refreshedAt = Date.now();

        this.#clearTimeout();
        this.maxAge(this.#maxAge);

        this.#onUpdated(this);
    }

    clear() {
        this.#clearTimeout();

        if (!weak.isDead(this.#cache))
            weak.get(this.#cache).delete(this.key);
    }

    refreshIn(refreshIn) {
        this.#refreshIn = refreshIn;
    }

    maxAge(maxAge) {
        if (isNil(maxAge))
            return this.#maxAge;

        this.#clearTimeout();

        // Allow non-expiring entries
        if (maxAge === Infinity || maxAge === false)
            return;

        this.#timer = setTimeout(this.clear.bind(this), maxAge);

        if (isFunction(this.#timer.unref))
            this.#timer.unref();
    }
};
