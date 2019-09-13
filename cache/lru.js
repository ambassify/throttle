function LruCache (options) {
    if (!(this instanceof LruCache))
        return new LruCache(options);

    options = options || {};
    this.storage = new Map();
    this.queue = [];
    this.maxSize = options.maxSize || Infinity;
}

LruCache.prototype._hit = function _hit(key) {
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
};

LruCache.prototype._evict = function _evict(key) {
    var idx = this.queue.indexOf(key);

    if (idx > -1)
        this.queue.splice(idx, 1);
};


LruCache.prototype.get = function get(k) {
    if (this.has(k))
        this._hit(k);

    return this.storage.get(k);
};

LruCache.prototype.has = function has(k) {
    return this.storage.has(k);
};

LruCache.prototype.set = function set(k, v) {
    this._hit(k);
    return this.storage.set(k, v);
};

LruCache.prototype.delete = function del(k) {
    this._evict(k);
    return this.storage.delete(k);
};

LruCache.prototype.clear = function clear() {
    this.queue = [];
    this.storage.clear();
};

module.exports = LruCache;
