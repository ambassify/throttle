module.exports = class LruCache {

    constructor(options) {
        if (!(this instanceof LruCache))
            return new LruCache(options);

        options = options || {};
        this.storage = new Map();
        this.queue = [];
        this.maxSize = options.maxSize || Infinity;
    }

    #hit(key) {
        var idx = this.queue.indexOf(key);

        if (idx > -1) {
            // If it is aready in the queue, move it to the end of the queue
            this.queue.splice(idx, 1);
            this.queue.push(key);
        } else {
            // Add to queue
            this.queue.push(key);

            // Delete least recently used from queue and storage
            if (this.queue.length > this.maxSize) {
                var evictKey = this.queue.shift();
                this.storage.delete(evictKey);
            }
        }
    }

    #evict(key) {
        var idx = this.queue.indexOf(key);

        if (idx > -1)
            this.queue.splice(idx, 1);
    }

    get(k) {
        if (this.has(k))
            this.#hit(k);

        return this.storage.get(k);
    }

    has(k) {
        return this.storage.has(k);
    }

    set(k, v) {
        this.#hit(k);
        return this.storage.set(k, v);
    }

    delete(k) {
        this.#evict(k);
        return this.storage.delete(k);
    }

    clear() {
        this.queue = [];
        this.storage.clear();
    }
};
