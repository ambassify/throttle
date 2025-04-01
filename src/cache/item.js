const { noop, isNil, isFunction } = require('../utils');
const { weak } = require('../weakref');

/**
 * An item in the cache
 */
class CacheItem {

    /**
     * Whether or not the item has its initial value
     */
    initialized = false;

    /**
     * The pending promise when throttle is currently running but already has
     * a previous value
     */
    pending = null;

    /**
     * The key for this cache item
     */
    key = null;

    #value = null;
    #error = null;
    #weakCache = null;
    #maxAge = null;
    #timer = null;
    #delay = null;
    #updatedAt = null;
    #onUpdated = noop;

    constructor({
        key,
        delay,
        weakCache,
        maxAge,
        onUpdated
    }) {
        this.key = key;

        this.#weakCache = weakCache;
        this.#maxAge = maxAge;
        this.#delay = delay;
        this.#updatedAt = null;
        this.#onUpdated = onUpdated;
    }

    /**
     * Whether or not the cache item's value is considered stale based on the
     * last time it was updated and its "delay" option.
     */
    get stale() {
        if (this.pending)
            return false;

        if (!this.#updatedAt)
            return true;

        if (!this.#delay)
            return true;


        return this.#updatedAt + this.#delay <= Date.now();
    }

    get value() {
        return this.#value;
    }

    /**
     * Current value of the cache item. When this is set, all timers and the like
     * for the item are also reset
     */
    set value(v) {
        this.#error = null;
        this.#value = v;

        this.#updated();
    }

    get error() {
        return this.#error;
    }

    /**
     * Same as "value" but used to indicate the result of throttled is an error
     */
    set error(err) {
        // When setting an error for a pending promise, set is as a rejection
        // to make sure the throttled function doesn't throw is synchronously.
        // Make sure the rejection doesn't thow uncaught by attaching a handler.
        if (this.pending) {
            this.value = Promise.reject(err);
            this.value.catch(noop);
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
        this.#updatedAt = Date.now();

        this.#clearTimeout();
        this.maxAge(this.#maxAge);

        this.#onUpdated(this);
    }

    /**
     * Clear the item from throttled's cache
     */
    clear() {
        this.#clearTimeout();

        if (!weak.isDead(this.#weakCache))
            weak.get(this.#weakCache).delete(this.key);
    }

    /**
     * Update this specific item's "delay"
     *
     * @param {Number} delay
     */
    delay(delay) {
        this.#delay = delay;
    }

    /**
     * Update this specific item's "maxAge"
     *
     * @param {Number | false} maxAge
     */
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
}

module.exports = CacheItem;
